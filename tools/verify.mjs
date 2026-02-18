#!/usr/bin/env node
/**
 * tools/verify.mjs — Canonical verification pipeline (single source of truth).
 * Usage: node tools/verify.mjs              (full — 10 oracles)
 *        node tools/verify.mjs --fast       (fast — hygiene + typecheck + discovery + tests)
 *        node tools/verify.mjs --help       (print usage and exit 0)
 *        node tools/verify.mjs --receipt "<label>"        (full + receipt)
 *        node tools/verify.mjs --fast --receipt "<label>" (fast + receipt)
 *        bash tools/verify                  (delegates here)
 *        bash tools/verify --fast           (delegates here with --fast)
 *        bash tools/verify --receipt "<label>"
 *
 * CANARY=1 node tools/verify.mjs  — proves boundary oracle catches violations
 *
 * Markers emitted (exactly one per run):
 *   VERIFY_FULL PASS | VERIFY_FULL FAIL   (full mode)
 *   VERIFY_FAST PASS | VERIFY_FAST FAIL   (fast mode)
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const IS_FAST    = args.includes("--fast");
const IS_HELP    = args.includes("--help");
const receiptIdx = args.indexOf("--receipt");
const RECEIPT_LABEL = receiptIdx !== -1 ? (args[receiptIdx + 1] ?? "") : null;
const MODE = IS_FAST ? "FAST" : "FULL";

// ── Help ──────────────────────────────────────────────────────────────
if (IS_HELP) {
  console.log(`
verify — AI Coding OS v3.3 verification pipeline

USAGE
  bash tools/verify                        Run full verify (10 oracles)
  bash tools/verify --fast                 Run fast verify (4 oracles)
  bash tools/verify --receipt "<label>"    Full verify then emit receipt
  bash tools/verify --fast --receipt "<label>"  Fast verify then emit receipt

MODES
  (default)   FULL verify — all 10 oracles
              Emits: VERIFY_FULL PASS | VERIFY_FULL FAIL

  --fast      FAST verify — hygiene + typecheck + discovery + tests (4 oracles)
              Emits: VERIFY_FAST PASS | VERIFY_FAST FAIL

  --receipt   Run verify then call node tools/receipt.mjs with <label>
              Receipt shows ORACLES_RUN: verify(full) or verify(fast)
              Available: now (T0219)

  --help      Print this message and exit 0

ORACLES (full mode)
  1  Repo hygiene        File ≤350 lines, fn ≤60 lines, no console.log in src
  2  Format check        Prettier compliance
  3  Lint                ESLint rules
  4  Typecheck           tsc --noEmit
  5  Boundary check      Domain cannot import infra or app
  6  Load smoke          Vite SSR import of domain+infra modules
  7  Build               vite build production bundle
  8  Discovery coverage  ≥1 .ts/.tsx file per layer (app/domain/infra)
  9  Docs freshness      Key docs exist with ≥3 non-empty lines
  10 Unit tests          vitest run

ORACLES (fast mode)
  1  Repo hygiene
  2  Typecheck
  3  Discovery coverage
  4  Unit tests

CANARY MODE
  CANARY=1 node tools/verify.mjs   — proves boundary oracle catches violations
`);
  process.exit(0);
}

// ── Cache writer ──────────────────────────────────────────────────────
function writeCache(result) {
  const ts = new Date().toISOString();
  const line = `VERIFY_${MODE} ${result} ${ts}\n`;
  try {
    mkdirSync(".cache", { recursive: true });
    writeFileSync(".cache/verify-last.txt", line, "utf-8");
  } catch {
    // best-effort; don't mask real failures
  }
}

// ── Canary mode ───────────────────────────────────────────────────────
if (process.env.CANARY === "1") {
  const infraDir = "src/infra/__canary__";
  const domainDir = "src/domain/__canary__";

  const cleanup = () => {
    for (const d of [infraDir, domainDir]) {
      if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    }
  };

  cleanup(); // ensure clean slate

  try {
    mkdirSync(infraDir, { recursive: true });
    mkdirSync(domainDir, { recursive: true });

    writeFileSync(`${infraDir}/x.ts`, "export const canary = 1;\n");
    writeFileSync(
      `${domainDir}/illegal.ts`,
      'import { canary } from "../../infra/__canary__/x";\nexport const v = canary;\n',
    );

    console.log("canary: wrote illegal domain→infra import");

    let boundaryPassed = false;
    try {
      execSync("npx tsx tools/check-boundaries.ts", { stdio: "inherit" });
      boundaryPassed = true;
    } catch {
      // expected failure
    }

    if (boundaryPassed) {
      console.error("canary: FAIL — boundary check did NOT catch the violation");
      cleanup();
      process.exit(1);
    }

    console.log("canary: PASS (boundary check failed as expected)");
  } finally {
    cleanup();
  }

  process.exit(0);
}

// ── Step definitions ──────────────────────────────────────────────────
const FULL_STEPS = [
  { name: "Repo hygiene",        cmd: "npx tsx tools/check-hygiene.ts" },
  { name: "Format check",        cmd: 'npx prettier --check "src/**/*.{ts,tsx}"' },
  { name: "Lint",                cmd: "npx eslint ." },
  { name: "Typecheck",           cmd: "npx tsc --noEmit" },
  { name: "Boundary check",      cmd: "npx tsx tools/check-boundaries.ts" },
  { name: "Load smoke",          cmd: "node tools/load-smoke.mjs" },
  { name: "Build",               cmd: "npx vite build" },
  { name: "Discovery coverage",  cmd: "node tools/check-discovery-coverage.mjs" },
  { name: "Docs freshness",      cmd: "node tools/check-docs-freshness.mjs" },
  { name: "Unit tests",          cmd: "npx vitest run" },
];

const FAST_STEPS = [
  { name: "Repo hygiene",        cmd: "npx tsx tools/check-hygiene.ts" },
  { name: "Typecheck",           cmd: "npx tsc --noEmit" },
  { name: "Discovery coverage",  cmd: "node tools/check-discovery-coverage.mjs" },
  { name: "Unit tests",          cmd: "npx vitest run" },
];

const steps = IS_FAST ? FAST_STEPS : FULL_STEPS;

// ── Run steps ─────────────────────────────────────────────────────────
console.log(`=== verify mode: ${MODE} (${steps.length} steps) ===`);

let step = 0;
for (const { name, cmd } of steps) {
  step++;
  console.log(`=== [${step}/${steps.length}] ${name} ===`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    console.error(`\nVERIFY: FAILED at step ${step} — ${name}`);
    writeCache("FAIL");
    console.error(`VERIFY_${MODE} FAIL`);
    process.exit(1);
  }
  console.log();
}

writeCache("PASS");
console.log("===============================");
console.log(`VERIFY_${MODE} PASS`);
console.log("VERIFY: ALL CHECKS PASSED");
console.log("===============================");

// ── Receipt (--receipt mode) ──────────────────────────────────────────
if (RECEIPT_LABEL !== null) {
  console.log("\n--- receipt ---");
  const env = {
    ...process.env,
    BATCH_LABEL: RECEIPT_LABEL || `BATCH: verify(${MODE.toLowerCase()})`,
    ORACLES_MODE: MODE.toLowerCase(),
  };
  try {
    execSync("node tools/receipt.mjs", { stdio: "inherit", env });
  } catch {
    // receipt failure is non-fatal for verify exit code
    console.error("receipt: failed to emit (non-fatal)");
  }
}
