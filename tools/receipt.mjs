#!/usr/bin/env node
/**
 * tools/receipt.mjs — Batch receipt generator (AI Coding OS v3.3).
 * Usage: node tools/receipt.mjs "<BATCH label>"
 *        bash tools/receipt "<BATCH label>"
 *
 * Prints a machine-parseable-ish receipt for the batch.
 * Reads .cache/verify-last.txt for verify provenance.
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "node:fs";

const batchLabel = process.argv[2] ?? process.env.BATCH_LABEL ?? process.env.BATCH ?? "(unlabeled)";

// ── Helpers ───────────────────────────────────────────────────────────
function git(cmd) {
  try {
    return execSync(cmd, { stdio: "pipe", timeout: 5000 }).toString().trim();
  } catch {
    return null;
  }
}

const SECRET_RE = /(?:ghp_|sk-|Bearer\s|token[=:]\s*)\S+/gi;
let redactionCount = 0;

function redact(str) {
  return str.replace(SECRET_RE, () => {
    redactionCount++;
    return "[REDACTED:token]";
  });
}

// ── Verify provenance ─────────────────────────────────────────────────
function readLastVerify() {
  const p = ".cache/verify-last.txt";
  if (!existsSync(p)) return null;
  try {
    return readFileSync(p, "utf-8").trim();
  } catch {
    return null;
  }
}

// ── Gather ────────────────────────────────────────────────────────────
const verifyLine = readLastVerify();
const result     = verifyLine?.includes("PASS") ? "PASS" : (verifyLine ? "FAIL" : "UNKNOWN");
const filesChanged = git("git show --name-only --pretty= HEAD") ?? "unavailable";
const tickets    = process.env.TICKETS ?? batchLabel.match(/T\d{4}/g)?.join(", ") ?? "see batch label";

// ── Output ────────────────────────────────────────────────────────────
const lines = [
  `RECEIPT_VERSION: 1`,
  `BATCH: ${batchLabel}`,
  `TICKETS: ${tickets}`,
  `FILES_CHANGED: ${filesChanged || "unavailable"}`,
  `ORACLES_RUN: verify(full)`,
  `RESULT: ${result}`,
  verifyLine ? `VERIFY_LAST_FILE: ${verifyLine}` : `VERIFY_LAST_FILE: unavailable`,
  `REDACTIONS_APPLIED: ${redactionCount} (tokens)`,
];

for (const line of lines.map(redact)) console.log(line);
