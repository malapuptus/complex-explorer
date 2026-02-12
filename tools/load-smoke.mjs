#!/usr/bin/env node
/**
 * tools/load-smoke.mjs — Import/load smoke test.
 * Runs a production build via Vite to verify all imports resolve and the bundle compiles.
 * Usage: node tools/load-smoke.mjs
 */

import { execSync } from "child_process";

console.log("Load smoke: building project...");
try {
  execSync("npx vite build", { stdio: "inherit" });
  console.log("Load smoke: PASS");
} catch {
  console.error("Load smoke: FAIL — build did not complete");
  process.exit(1);
}
