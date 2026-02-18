#!/usr/bin/env node
/**
 * tools/context.mjs — Deterministic repo context snapshot (AI Coding OS v3.3).
 * Usage: node tools/context.mjs
 *        bash tools/context
 *
 * Prints KEY: VALUE lines suitable for pasting as batch preflight.
 * Degrades gracefully when git is unavailable.
 * Redacts known secret patterns (tokens, keys).
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "node:fs";

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
  return str.replace(SECRET_RE, (m) => {
    redactionCount++;
    return "[REDACTED:token]";
  });
}

// ── Last verify cache ─────────────────────────────────────────────────
function readLastVerify() {
  const p = ".cache/verify-last.txt";
  if (!existsSync(p)) return "unavailable";
  try {
    return readFileSync(p, "utf-8").trim();
  } catch {
    return "unavailable";
  }
}

// ── Gather info ───────────────────────────────────────────────────────
const branch   = git("git rev-parse --abbrev-ref HEAD") ?? "git unavailable";
const commit   = git("git rev-parse --short HEAD") ?? "git unavailable";
const statusRaw = git("git status --porcelain");
const status   = statusRaw === null ? "unknown" : (statusRaw.length === 0 ? "clean" : "dirty");
const lastCommits = git("git log --oneline -5") ?? "git unavailable";
const changedFiles = statusRaw ? statusRaw.split("\n").map(l => l.slice(3)).join(", ") || "none" : "git unavailable";
const lastVerify = readLastVerify();

// ── Output ────────────────────────────────────────────────────────────
const out = [
  `CAPABILITY: EDITOR_ONLY`,
  `BRANCH: ${branch}`,
  `COMMIT: ${commit}`,
  `STATUS: ${status}`,
  `LAST_COMMITS:\n${lastCommits.split("\n").map(l => "  " + l).join("\n")}`,
  `CHANGED_FILES: ${changedFiles}`,
  `LAST_VERIFY: ${lastVerify}`,
].map(redact);

for (const line of out) console.log(line);
console.log(`REDACTIONS_APPLIED: ${redactionCount} (tokens)`);
