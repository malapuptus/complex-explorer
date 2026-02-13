#!/usr/bin/env node
/**
 * tools/verify.mjs — Canonical verification pipeline (single source of truth).
 * Usage: node tools/verify.mjs
 *        bash tools/verify  (delegates here)
 *
 * CANARY=1 node tools/verify.mjs  — proves boundary oracle catches violations
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";

// ── Canary mode ──────────────────────────────────────────────────────
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

// ── Normal mode ──────────────────────────────────────────────────────
const steps = [
  { name: "Repo hygiene", cmd: "npx tsx tools/check-hygiene.ts" },
  { name: "Format check", cmd: 'npx prettier --check "src/**/*.{ts,tsx}"' },
  { name: "Lint", cmd: "npm run lint" },
  { name: "Typecheck", cmd: "npx tsc --noEmit" },
  { name: "Boundary check", cmd: "npx tsx tools/check-boundaries.ts" },
  { name: "Load smoke", cmd: "node tools/load-smoke.mjs" },
  { name: "Unit tests", cmd: "npm run test" },
];

let step = 0;
for (const { name, cmd } of steps) {
  step++;
  console.log(`=== [${step}/${steps.length}] ${name} ===`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    console.error(`\nVERIFY: FAILED at step ${step} — ${name}`);
    process.exit(1);
  }
  console.log();
}

console.log("===============================");
console.log("VERIFY: ALL CHECKS PASSED");
console.log("===============================");
