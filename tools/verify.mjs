#!/usr/bin/env node
/**
 * tools/verify.mjs — Canonical verification pipeline (single source of truth).
 * Usage: node tools/verify.mjs
 *        bash tools/verify  (delegates here)
 */

import { execSync } from "child_process";

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
