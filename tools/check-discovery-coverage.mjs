#!/usr/bin/env node
/**
 * tools/check-discovery-coverage.mjs — Meta-oracle: asserts discovery finds
 * at least the minimum expected items in expected directories.
 *
 * Prints: DISCOVERY PASS (exit 0) or DISCOVERY FAIL (exit 1)
 *
 * "Discovery" = finding source files across the three layer roots.
 * Expected: at least 1 .ts/.tsx file in each of app/, domain/, infra/.
 */

import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SRC = resolve(__dirname, "../src");

// ── Config (keep config-driven; see policy.json for future extension) ─
const EXPECTED_LAYER_DIRS = ["app", "domain", "infra"];
const MIN_FILES_PER_LAYER = 1;

// ── Walk helper ───────────────────────────────────────────────────────
function countTsFiles(dir) {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        count += countTsFiles(join(dir, entry.name));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        count++;
      }
    }
  } catch {
    // directory might not exist
  }
  return count;
}

// ── Check ─────────────────────────────────────────────────────────────
const results = [];
let anyFail = false;

for (const layer of EXPECTED_LAYER_DIRS) {
  const dir = join(SRC, layer);
  const count = countTsFiles(dir);
  const pass = count >= MIN_FILES_PER_LAYER;
  if (!pass) anyFail = true;
  results.push({ layer, count, pass });
}

// ── Report ────────────────────────────────────────────────────────────
if (anyFail) {
  console.error("DISCOVERY FAIL");
  for (const r of results) {
    const status = r.pass ? "OK" : "FAIL";
    console.error(`  [${status}] src/${r.layer}/: ${r.count} .ts/.tsx files (min ${MIN_FILES_PER_LAYER})`);
  }
  process.exit(1);
} else {
  console.log("DISCOVERY PASS");
  for (const r of results) {
    console.log(`  [OK] src/${r.layer}/: ${r.count} .ts/.tsx files`);
  }
}
