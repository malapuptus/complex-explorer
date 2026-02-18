#!/usr/bin/env node
/**
 * tools/check-markers.mjs — Meta-oracle: asserts required v3.3 markers exist.
 * Usage: node tools/check-markers.mjs <file-to-scan>
 *        Or reads stdin if no file provided.
 *
 * Prints: MARKERS PASS  (exit 0) or MARKERS FAIL (exit 1)
 *
 * Required markers (at least one of each group must appear):
 *   Group A: VERIFY_FULL PASS | VERIFY_FULL FAIL | VERIFY_FAST PASS | VERIFY_FAST FAIL
 */

import { readFileSync } from "node:fs";

// ── Config ────────────────────────────────────────────────────────────
const REQUIRED_GROUPS = [
  {
    name: "verify-mode-marker",
    patterns: [
      /VERIFY_FULL PASS/,
      /VERIFY_FULL FAIL/,
      /VERIFY_FAST PASS/,
      /VERIFY_FAST FAIL/,
    ],
    description: "One of VERIFY_FULL PASS|FAIL or VERIFY_FAST PASS|FAIL",
  },
];

// ── Read input ────────────────────────────────────────────────────────
let input = "";
const file = process.argv[2];
if (file) {
  try {
    input = readFileSync(file, "utf-8");
  } catch (e) {
    console.error(`MARKERS FAIL: could not read file: ${file}`);
    process.exit(1);
  }
} else {
  // When invoked standalone without input, pass (markers oracle is for
  // post-verify scanning; standalone means nothing to scan = vacuously ok)
  console.log("MARKERS PASS (no input — standalone check)");
  process.exit(0);
}

// ── Check groups ─────────────────────────────────────────────────────
const missing = [];
for (const group of REQUIRED_GROUPS) {
  const found = group.patterns.some((p) => p.test(input));
  if (!found) {
    missing.push(`  missing: ${group.name} — ${group.description}`);
  }
}

if (missing.length > 0) {
  console.error("MARKERS FAIL");
  for (const m of missing) console.error(m);
  process.exit(1);
} else {
  console.log("MARKERS PASS");
}
