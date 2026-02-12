#!/usr/bin/env node
/**
 * tools/verify.mjs — Cross-platform Node wrapper for the canonical verify pipeline.
 * Usage: node tools/verify.mjs
 *
 * Runs the same 7 oracles as tools/verify (bash), but works on Windows too.
 */

import { execSync } from "child_process";

const steps = [
  { name: "Repo hygiene", cmd: "npx tsx tools/check-hygiene.ts" },
  { name: "Format check", cmd: 'npx prettier --check "src/**/*.{ts,tsx}"' },
  { name: "Lint", cmd: "npx eslint ." },
  { name: "Typecheck", cmd: "npx tsc --noEmit" },
  { name: "Boundary check", cmd: "npx tsx tools/check-boundaries.ts" },
  { name: "Build (load smoke)", cmd: "npx vite build" },
  { name: "Unit tests", cmd: "npx vitest run" },
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
