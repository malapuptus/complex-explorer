#!/usr/bin/env node
/**
 * tools/repo-check.mjs — Runs repo hygiene checks.
 * Wrapper around tools/check-hygiene.ts for direct invocation.
 * Usage: node tools/repo-check.mjs
 */

import { execSync } from "child_process";

try {
  execSync("npx tsx tools/check-hygiene.ts", { stdio: "inherit" });
} catch {
  process.exit(1);
}
