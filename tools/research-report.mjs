#!/usr/bin/env node
/**
 * tools/research-report.mjs — local-only Research Mode HTML report generator.
 * Ticket 0262: reads a pkg_v1 JSON, verifies integrity, emits self-contained HTML.
 *
 * Usage:
 *   node tools/research-report.mjs path/to/pkg.json [--out report.html]
 *
 * Exits non-zero on integrity failure.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ── CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const inputFile = args.find((a) => !a.startsWith("--"));
const outFlag = args.indexOf("--out");
const outputFile =
  outFlag >= 0 ? args[outFlag + 1] : "research-report.html";

if (!inputFile) {
  console.error(
    "Usage: node tools/research-report.mjs <pkg.json> [--out report.html]",
  );
  process.exit(1);
}

// ── Read + parse ──────────────────────────────────────────────────────

let pkgRaw;
try {
  pkgRaw = fs.readFileSync(path.resolve(inputFile), "utf8");
} catch (e) {
  console.error(`Cannot read file: ${e.message}`);
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(pkgRaw);
} catch (e) {
  console.error(`JSON parse error: ${e.message}`);
  process.exit(1);
}

// ── Integrity check ───────────────────────────────────────────────────

const KEY_ORDER = [
  "packageVersion",
  "packageHash",
  "hashAlgorithm",
  "exportedAt",
  "bundle",
  "csv",
  "csvRedacted",
];

function stableStringify(obj, keyOrder) {
  return JSON.stringify(
    obj,
    keyOrder
      ? (() => {
          let isRoot = true;
          return function (_key, value) {
            if (
              isRoot &&
              typeof value === "object" &&
              value !== null &&
              !Array.isArray(value)
            ) {
              isRoot = false;
              const ordered = {};
              for (const k of keyOrder) {
                if (k in value) ordered[k] = value[k];
              }
              for (const k of Object.keys(value)) {
                if (!(k in ordered)) ordered[k] = value[k];
              }
              return ordered;
            }
            return value;
          };
        })()
      : undefined,
    2,
  );
}

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

const expected = pkg.packageHash;
const forHash = { ...pkg };
delete forHash.packageHash;
const actual = sha256Hex(stableStringify(forHash, KEY_ORDER));
const integrityPass = actual === expected;

if (!integrityPass) {
  console.error(
    `\nIntegrity FAIL for ${inputFile}`,
    `\n  expected: ${expected}`,
    `\n  actual:   ${actual}`,
    "\n\nError code: ERR_INTEGRITY_MISMATCH",
  );
  process.exit(1);
}

console.log(`Integrity OK: ${actual.slice(0, 16)}…`);

// ── Extract data ──────────────────────────────────────────────────────

const bundle = pkg.bundle ?? {};
const sr = bundle.sessionResult ?? {};
const snap = bundle.stimulusPackSnapshot ?? {};
const privacy = bundle.privacy ?? {};
const config = sr.config ?? {};
const scoring = sr.scoring ?? {};
const summary = scoring.summary ?? {};
const trialFlags = scoring.trialFlags ?? [];
const trials = sr.trials ?? [];
const sessionContext = sr.sessionContext ?? null;
const importedFrom = sr.importedFrom ?? null;

const scoredTrials = trials.filter((t) => !t.isPractice);

// Per-trial flag map
const flagMap = {};
for (const tf of trialFlags) {
  flagMap[tf.trialIndex] = tf.flags ?? [];
}

// Compute rt stats
function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

const rts = scoredTrials.map((t) => t.association?.reactionTimeMs ?? 0);
const rtMean = mean(rts);
const rtMedian = median(rts);
const rtSd = stdDev(rts);
const rtMin = rts.length ? Math.min(...rts) : 0;
const rtMax = rts.length ? Math.max(...rts) : 0;

// Anomaly list: top 10 by RT z-score
const anomalies = scoredTrials
  .map((t) => {
    const rt = t.association?.reactionTimeMs ?? 0;
    const z = rtSd > 0 ? Math.abs((rt - rtMean) / rtSd) : 0;
    return { word: t.stimulus?.word ?? "?", rt, z, flags: flagMap[t.stimulus?.index ?? -1] ?? [] };
  })
  .sort((a, b) => b.z - a.z)
  .slice(0, 10);

// ── HTML helpers ──────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(...cells) {
  return `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
}

function th(...headers) {
  return `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`;
}

function table(headers, rows) {
  return `<table><thead>${th(...headers)}</thead><tbody>${rows.join("")}</tbody></table>`;
}

function section(title, content) {
  return `<section><h2>${esc(title)}</h2>${content}</section>`;
}

function dl(pairs) {
  const items = pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join("");
  return `<dl>${items}</dl>`;
}

// ── Sections ──────────────────────────────────────────────────────────

const headerSection = section(
  "Package Header",
  dl([
    ["Package version", pkg.packageVersion],
    ["Package hash", pkg.packageHash],
    ["Hash algorithm", pkg.hashAlgorithm],
    ["Exported at", pkg.exportedAt],
    ["Export schema", bundle.exportSchemaVersion],
    ["App version", bundle.appVersion],
    ["Protocol doc", bundle.protocolDocVersion],
    ["Scoring algorithm", bundle.scoringAlgorithm],
    ["Privacy mode", privacy.mode],
    ["Includes stimulus words", privacy.includesStimulusWords],
    ["Includes responses", privacy.includesResponses],
    ["Identifiers anonymized", privacy.identifiersAnonymized ?? "n/a"],
  ]),
);

const summarySection = section(
  "Session Summary",
  dl([
    ["Session ID", sr.id],
    ["Started at", sr.startedAt],
    ["Completed at", sr.completedAt],
    ["Pack ID", config.stimulusListId],
    ["Pack version", config.stimulusListVersion],
    ["Order policy", config.orderPolicy],
    ["Seed used", sr.seedUsed],
    ["Trial timeout ms", config.trialTimeoutMs ?? "none"],
    ["Break every N", config.breakEveryN ?? "none"],
    ["Total scored trials", summary.totalTrials ?? scoredTrials.length],
    ["Mean RT (ms)", rtMean.toFixed(1)],
    ["Median RT (ms)", rtMedian.toFixed(1)],
    ["Std dev RT (ms)", rtSd.toFixed(1)],
    ["Fastest RT (ms)", rtMin],
    ["Slowest RT (ms)", rtMax],
    ["Empty responses", summary.emptyResponseCount ?? "n/a"],
    ["Repeated responses", summary.repeatedResponseCount ?? "n/a"],
    ["Timing outliers", summary.timingOutlierCount ?? "n/a"],
    ["High editing", summary.highEditingCount ?? "n/a"],
    ["Timeouts", summary.timeoutCount ?? "n/a"],
    ...(sessionContext
      ? [
          ["Device class", sessionContext.deviceClass],
          ["OS family", sessionContext.osFamily],
          ["Browser family", sessionContext.browserFamily],
          ["Locale", sessionContext.locale],
          ["Timezone", sessionContext.timeZone],
          ["Used IME", sessionContext.inputHints?.usedIME],
          ["Total IME compositions", sessionContext.inputHints?.totalCompositionCount],
        ]
      : []),
    ...(importedFrom
      ? [
          ["Imported from (pkg)", importedFrom.packageVersion],
          ["Imported from (hash)", importedFrom.packageHash],
          ["Original session ID", importedFrom.originalSessionId ?? "n/a"],
        ]
      : []),
  ]),
);

const provSection = section(
  "Provenance",
  dl([
    ["List ID", snap.provenance?.listId],
    ["List version", snap.provenance?.listVersion],
    ["Language", snap.provenance?.language],
    ["Source", snap.provenance?.sourceName],
    ["Year", snap.provenance?.sourceYear],
    ["Citation", snap.provenance?.sourceCitation],
    ["License", snap.provenance?.licenseNote],
    ["Word count", snap.provenance?.wordCount],
    ["List hash (sha-256)", snap.stimulusListHash],
    ["Schema version", snap.stimulusSchemaVersion],
  ]),
);

const perWordRows = scoredTrials.map((t) => {
  const a = t.association ?? {};
  const flags = (flagMap[t.stimulus?.index ?? -1] ?? []).join(", ");
  const response = privacy.includesResponses !== false ? (a.response ?? "") : "[redacted]";
  return row(
    t.stimulus?.word ?? "?",
    a.reactionTimeMs ?? "",
    a.tFirstKeyMs ?? "",
    a.editCount ?? "",
    a.backspaceCount ?? "",
    a.compositionCount ?? "",
    t.timedOut ? "yes" : "no",
    response.length || response === "[redacted]" ? String(response.length) : "0",
    flags || "—",
  );
});

const perWordSection = section(
  "Per-Word Table",
  table(
    ["Word", "RT (ms)", "tFirstKey (ms)", "Edits", "Backspaces", "Compositions", "Timed out", "Resp len", "Flags"],
    perWordRows,
  ),
);

const anomalyRows = anomalies.map((a) =>
  row(a.word, a.rt, a.z.toFixed(2), (a.flags ?? []).join(", ") || "—"),
);
const anomalySection = section(
  "Top Anomalies (by RT z-score)",
  anomalies.length
    ? table(["Word", "RT (ms)", "Z-score", "Flags"], anomalyRows)
    : "<p>No anomalies to display.</p>",
);

// ── Assemble HTML ─────────────────────────────────────────────────────

const generatedAt = new Date().toISOString();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Research Report — ${esc(sr.id ?? "unknown")}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 1100px; color: #222; font-size: 14px; }
  h1 { font-size: 1.4rem; margin-bottom: .25rem; }
  h2 { font-size: 1.1rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: .25rem; }
  section { margin-bottom: 1.5rem; }
  dl { display: grid; grid-template-columns: 220px 1fr; gap: .25rem .75rem; margin: .5rem 0; }
  dt { font-weight: 600; color: #555; }
  dd { margin: 0; word-break: break-all; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: .3rem .5rem; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  tr:nth-child(even) { background: #fafafa; }
  .meta { color: #888; font-size: .8rem; margin-bottom: 1.5rem; }
  .integrity { color: green; font-weight: bold; }
</style>
</head>
<body>
<h1>Complex Mapper — Research Report</h1>
<p class="meta">
  Generated: ${esc(generatedAt)} &bull;
  Source: ${esc(path.basename(inputFile))} &bull;
  <span class="integrity">Integrity: PASS ✓</span>
</p>
${headerSection}
${summarySection}
${provSection}
${perWordSection}
${anomalySection}
</body>
</html>`;

// ── Write output ──────────────────────────────────────────────────────

fs.writeFileSync(path.resolve(outputFile), html, "utf8");
console.log(`Report written to: ${outputFile}`);
