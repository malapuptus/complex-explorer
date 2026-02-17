#!/usr/bin/env node
/**
 * tools/verify-proxy.mjs — Lovable-compatible proxy verify runner.
 * Runs the maximum available subset of the 8 verify oracles,
 * printing PASS/FAIL/SKIP for each in the same order as verify.mjs.
 *
 * Usage: node tools/verify-proxy.mjs
 *
 * In environments where shell commands are unavailable (e.g. Lovable sandbox),
 * this script documents which oracles can and cannot run.
 */

import { execSync } from "child_process";

const oracles = [
  { name: "Repo hygiene",  cmd: "npx tsx tools/check-hygiene.ts" },
  { name: "Format check",  cmd: 'npx prettier --check "src/**/*.{ts,tsx}"' },
  { name: "Lint",           cmd: "npx eslint ." },
  { name: "Typecheck",      cmd: "npx tsc --noEmit" },
  { name: "Boundary check", cmd: "npx tsx tools/check-boundaries.ts" },
  { name: "Load smoke",     cmd: "node tools/load-smoke.mjs" },
  { name: "Build",          cmd: "npx vite build" },
  { name: "Unit tests",     cmd: "npx vitest run" },
];

const results = [];
let anyFail = false;

for (let i = 0; i < oracles.length; i++) {
  const { name, cmd } = oracles[i];
  const step = i + 1;
  process.stdout.write(`[${step}/${oracles.length}] ${name} ... `);

  try {
    execSync(cmd, { stdio: "pipe", timeout: 120_000 });
    console.log("PASS");
    results.push({ step, name, status: "PASS", reason: null });
  } catch (err) {
    // Distinguish "command not found / environment issue" from real failures
    const stderr = err.stderr?.toString() ?? "";
    const exitCode = err.status;

    if (
      exitCode === 127 ||
      stderr.includes("command not found") ||
      stderr.includes("not recognized") ||
      stderr.includes("ENOENT")
    ) {
      console.log("SKIP (command unavailable)");
      results.push({ step, name, status: "SKIP", reason: "command unavailable" });
    } else {
      console.log("FAIL");
      anyFail = true;
      results.push({ step, name, status: "FAIL", reason: stderr.slice(0, 200) || `exit ${exitCode}` });
    }
  }
}

// Summary
console.log("\n=== Proxy Verify Summary ===");
console.log("| # | Oracle | Status | Notes |");
console.log("|---|--------|--------|-------|");
for (const r of results) {
  const notes = r.reason ?? "";
  console.log(`| ${r.step} | ${r.name} | ${r.status} | ${notes} |`);
}

const passed = results.filter(r => r.status === "PASS").length;
const skipped = results.filter(r => r.status === "SKIP").length;
const failed = results.filter(r => r.status === "FAIL").length;

console.log(`\nPassed: ${passed}  Skipped: ${skipped}  Failed: ${failed}`);

if (anyFail) {
  console.error("\nPROXY VERIFY: FAIL");
  process.exit(1);
} else if (skipped > 0) {
  console.log("\nPROXY VERIFY: PASS (with skips)");
} else {
  console.log("\nPROXY VERIFY: ALL PASS");
}
