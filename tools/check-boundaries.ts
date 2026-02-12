import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "../src");

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

function getLayer(filePath: string): "domain" | "infra" | "ui" | null {
  const rel = path.relative(SRC, filePath).replace(/\\/g, "/");
  if (rel.startsWith("domain/")) return "domain";
  if (rel.startsWith("infra/")) return "infra";
  if (rel.startsWith("components/") || rel.startsWith("pages/")) return "ui";
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

function resolveImportLayer(
  importPath: string,
  fromFile: string
): "domain" | "infra" | "ui" | null {
  if (!importPath.startsWith(".") && !importPath.startsWith("@/")) return null;

  let resolved: string;
  if (importPath.startsWith("@/")) {
    resolved = path.join(SRC, importPath.slice(2));
  } else {
    resolved = path.resolve(path.dirname(fromFile), importPath);
  }

  return getLayer(resolved);
}

const ILLEGAL: Record<string, string[]> = {
  domain: ["infra", "ui"],
  infra: ["ui"],
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
        `Boundaries: FAIL - ${rel}: illegal import from ${layer} -> ${targetLayer} (${imp})`
      );
      violations++;
    }
  }
}

if (violations > 0) {
  process.exit(1);
} else {
  console.log("Boundaries: PASS");
}
