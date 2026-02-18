#!/usr/bin/env node
/**
 * tools/verify.mjs — Canonical verification pipeline (single source of truth).
 * Usage: node tools/verify.mjs              (full — 8 oracles)
 *        node tools/verify.mjs --fast       (fast — hygiene + typecheck + tests)
 *        bash tools/verify                  (delegates here)
 *        bash tools/verify --fast           (delegates here with --fast)
 *
 * CANARY=1 node tools/verify.mjs  — proves boundary oracle catches violations
 *
 * Markers emitted (exactly one per run):
 *   VERIFY_FULL PASS | VERIFY_FULL FAIL   (full mode)
 *   VERIFY_FAST PASS | VERIFY_FAST FAIL   (fast mode)
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";

const IS_FAST = process.argv.includes("--fast");
const MODE = IS_FAST ? "FAST" : "FULL";

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
