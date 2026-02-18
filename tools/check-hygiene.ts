import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC = path.resolve(__dirname, "../src");
const MAX_FILE_LINES = 350;
const MAX_FUNC_LINES = 60;

// ── Baseline (ratchet) ────────────────────────────────────────────────
// Grandfathered violations loaded from tools/hygiene-baseline.json.
// Schema: { entries: Array<{ kind, file, symbol?, baseline }> }
interface BaselineEntry {
  kind: "file_lines" | "fn_lines";
  file: string;
  symbol?: string;
  baseline: number;
}

function loadBaseline(): BaselineEntry[] {
  const p = path.resolve(__dirname, "hygiene-baseline.json");
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf-8")) as { entries?: BaselineEntry[] };
    return raw.entries ?? [];
  } catch {
    return [];
  }
}

const baseline = loadBaseline();

function findBaseline(kind: "file_lines" | "fn_lines", file: string, symbol?: string) {
  return baseline.find(
    (e) =>
      e.kind === kind &&
      e.file === file &&
      (kind === "file_lines" || e.symbol === symbol),
  );
}

// ── Helpers ───────────────────────────────────────────────────────────
function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── Check loop ────────────────────────────────────────────────────────
const newViolations: string[] = [];
const regressions: string[] = [];
const grandfathered: string[] = [];
const files = walk(SRC);

for (const file of files) {
  const rel = path.relative(SRC, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  // ── File length ──────────────────────────────────────────────────
  if (lines.length > MAX_FILE_LINES) {
    const entry = findBaseline("file_lines", rel);
    if (!entry) {
      newViolations.push(`${rel}: ${lines.length} lines (max ${MAX_FILE_LINES}) [new violation]`);
    } else if (lines.length > entry.baseline) {
      regressions.push(
        `${rel}: ${lines.length} lines exceeds baseline ${entry.baseline} [baseline regression]`,
      );
    } else {
      grandfathered.push(`${rel}: ${lines.length} lines (grandfathered ≤ ${entry.baseline})`);
    }
  }

  // ── console.log ──────────────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/console\.log\s*\(/.test(line) && !line.trim().startsWith("//")) {
      newViolations.push(
        `${rel}:${i + 1}: console.log found (use console.warn/error if intentional) [new violation]`,
      );
    }
  }

  // ── Function length ──────────────────────────────────────────────
  let depth = 0;
  let funcStart = -1;
  let funcName = "";
  let inFunc = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inFunc) {
      if (/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=)/.test(line) && line.includes("{")) {
        const match = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=)/);
        funcName = match?.[1] || match?.[2] || "anonymous";
        funcStart = i;
        depth = 0;
        inFunc = true;
      }
    }

    if (inFunc) {
      for (const ch of line) {
        if (ch === "{") depth++;
        if (ch === "}") depth--;
      }
      if (depth <= 0 && funcStart >= 0) {
        const funcLines = i - funcStart + 1;
        if (funcLines > MAX_FUNC_LINES) {
          const entry = findBaseline("fn_lines", rel, funcName);
          if (!entry) {
            newViolations.push(
              `${rel}:${funcStart + 1}: function '${funcName}' is ${funcLines} lines (max ${MAX_FUNC_LINES}) [new violation]`,
            );
          } else if (funcLines > entry.baseline) {
            regressions.push(
              `${rel}:${funcStart + 1}: function '${funcName}' is ${funcLines} lines, exceeds baseline ${entry.baseline} [baseline regression]`,
            );
          } else {
            grandfathered.push(
              `${rel}:${funcStart + 1}: function '${funcName}' is ${funcLines} lines (grandfathered ≤ ${entry.baseline})`,
            );
          }
        }
        inFunc = false;
        funcStart = -1;
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────
if (grandfathered.length > 0) {
  console.warn("Hygiene: grandfathered items (no action required):");
  for (const g of grandfathered) {
    console.warn(`  ~ ${g}`);
  }
}

const failures = [...regressions, ...newViolations];

if (failures.length > 0) {
  console.error("Hygiene: FAIL");
  for (const v of failures) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
} else {
  console.log("Hygiene: PASS");
}
