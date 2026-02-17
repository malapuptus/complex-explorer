import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC = path.resolve(__dirname, "../src");
const MAX_FILE_LINES = 350;
const MAX_FUNC_LINES = 60;

// Temporary allowlist for files documented in docs/SCOPE_EXCEPTIONS.md
// TODO: Remove entries as files are decomposed (see Ticket 0162+)
const ALLOWLIST: Record<string, { maxLines?: number; maxFunc?: number }> = {
  "app/DemoSession.tsx": { maxLines: 500 },
  "app/ResultsView.tsx": { maxLines: 400 },
};

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

const violations: string[] = [];
const files = walk(SRC);

for (const file of files) {
  const rel = path.relative(SRC, file);
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  // Check file length (with allowlist override)
  const fileLimit = ALLOWLIST[rel]?.maxLines ?? MAX_FILE_LINES;
  if (lines.length > fileLimit) {
    violations.push(`${rel}: ${lines.length} lines (max ${fileLimit})`);
  }

  // Check for console.log
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/console\.log\s*\(/.test(line) && !line.trim().startsWith("//")) {
      violations.push(`${rel}:${i + 1}: console.log found`);
    }
  }

  // Check function length (simple brace-counting)
  const funcRe =
    /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>))|(?:async\s+)?\w+\s*\([^)]*\)\s*\{/g;
  let depth = 0;
  let funcStart = -1;
  let funcName = "";
  let inFunc = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inFunc) {
      // Detect function start by looking for opening brace
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
        const funcLimit = ALLOWLIST[rel]?.maxFunc ?? MAX_FUNC_LINES;
        if (funcLines > funcLimit) {
          violations.push(
            `${rel}:${funcStart + 1}: function '${funcName}' is ${funcLines} lines (max ${funcLimit})`,
          );
        }
        inFunc = false;
        funcStart = -1;
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Hygiene: FAIL");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
} else {
  console.log("Hygiene: PASS");
}
