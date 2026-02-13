import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "../src");

/**
 * Layer model (must match CONSTITUTION.md):
 *
 * | Layer  | Directory    | May import from        |
 * |--------|-------------|------------------------|
 * | app    | src/app/    | domain, infra, external|
 * | domain | src/domain/ | external only (pure)   |
 * | infra  | src/infra/  | domain, external       |
 *
 * Legacy UI directories (src/components/, src/pages/, src/hooks/)
 * are treated as "app" layer for backward compatibility.
 */

type Layer = "app" | "domain" | "infra";

function walk(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
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

function getLayer(filePath: string): Layer | null {
  const rel = path.relative(SRC, filePath).replace(/\\/g, "/");
  if (rel.startsWith("app/")) return "app";
  if (rel.startsWith("domain/")) return "domain";
  if (rel.startsWith("infra/")) return "infra";
  // Legacy directories → app layer
  if (rel.startsWith("components/") || rel.startsWith("pages/") || rel.startsWith("hooks/")) {
    return "app";
  }
  return null;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const re = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

function resolveImportLayer(importPath: string, fromFile: string): Layer | null {
  if (!importPath.startsWith(".") && !importPath.startsWith("@/")) return null;

  let resolved: string;
  if (importPath.startsWith("@/")) {
    resolved = path.join(SRC, importPath.slice(2));
  } else {
    resolved = path.resolve(path.dirname(fromFile), importPath);
  }

  return getLayer(resolved);
}

/** Illegal import targets per layer. */
const ILLEGAL: Record<string, Layer[]> = {
  domain: ["infra", "app"],
  infra: ["app"],
};

let violations = 0;
const files = walk(SRC);

for (const file of files) {
  const layer = getLayer(file);
  if (!layer || !ILLEGAL[layer]) continue;

  const content = fs.readFileSync(file, "utf-8");
  const imports = extractImports(content);

  for (const imp of imports) {
    const targetLayer = resolveImportLayer(imp, file);
    if (targetLayer && ILLEGAL[layer].includes(targetLayer)) {
      const rel = path.relative(SRC, file);
      console.error(
        `Boundary violation: ${rel} (${layer} layer) imports from ${targetLayer} layer via "${imp}" — rule: ${layer} cannot import ${targetLayer}`
      );
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\nBoundaries: FAIL (${violations} violation${violations > 1 ? "s" : ""})`);
  process.exit(1);
} else {
  console.log("Boundaries: PASS");
}
