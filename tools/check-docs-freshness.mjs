#!/usr/bin/env node
/**
 * tools/check-docs-freshness.mjs — Docs freshness oracle (Tier B: warn-first).
 *
 * Checks that docs listed in policy.json exist and have non-trivial content.
 * Prints: DOCS_FRESH PASS | DOCS_FRESH WARN (exit 0 in both cases for Tier B)
 *
 * Tier B = warn-first: never exits nonzero unless --strict is passed.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Load policy ───────────────────────────────────────────────────────
const policyPath = resolve(__dirname, "config/policy.json");
let policy;
try {
  policy = JSON.parse(readFileSync(policyPath, "utf-8"));
} catch {
  console.warn("DOCS_FRESH WARN: could not load tools/config/policy.json");
  process.exit(0);
}

const docsToCheck = policy.docsToKeepFresh ?? [
  "docs/CURRENT.md",
  "docs/DECISIONS.md",
  "docs/CORE_MODULES.md",
];

const STRICT = process.argv.includes("--strict");
const MIN_LINES = 3;

// ── Check ─────────────────────────────────────────────────────────────
const issues = [];

for (const docPath of docsToCheck) {
  const abs = resolve(ROOT, docPath);
  if (!existsSync(abs)) {
    issues.push(`  missing: ${docPath}`);
    continue;
  }
  const content = readFileSync(abs, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < MIN_LINES) {
    issues.push(`  thin: ${docPath} has only ${lines.length} non-empty lines (min ${MIN_LINES})`);
  }
}

// ── Report ────────────────────────────────────────────────────────────
if (issues.length > 0) {
  console.warn("DOCS_FRESH WARN");
  for (const i of issues) console.warn(i);
  if (STRICT) {
    process.exit(1);
  }
} else {
  console.log("DOCS_FRESH PASS");
  for (const d of docsToCheck) {
    console.log(`  [OK] ${d}`);
  }
}
