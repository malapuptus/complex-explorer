#!/usr/bin/env node
/**
 * tools/load-smoke.mjs — Import/load smoke test via Vite SSR.
 * Scans only import-safe layers (src/domain/**, src/infra/**) — NOT src/app/**,
 * which may reference browser-only globals. The build step covers app layer correctness.
 *
 * Works on Node 18/20+ (no glob from node:fs/promises).
 *
 * Usage: node tools/load-smoke.mjs
 */

import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer } from "vite";

/** Only scan these subdirectories of src/ (import-safe layers). */
const SCAN_DIRS = [resolve("src/domain"), resolve("src/infra")];
const EXCLUDE_RE = /(\/__tests__\/|__mocks__|\.test\.|\.stories\.|\.d\.ts$)/;
const INCLUDE_RE = /\.(ts|tsx)$/;

/** Recursively walk a directory, returning file paths. */
async function walk(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(full)));
    } else if (INCLUDE_RE.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  // Discover modules from import-safe layers only
  let files = [];
  for (const dir of SCAN_DIRS) {
    try {
      files.push(...(await walk(dir)));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      // directory doesn't exist yet — that's fine
    }
  }

  // Filter out non-runtime files
  const modules = files.filter((f) => !EXCLUDE_RE.test(f));

  if (modules.length === 0) {
    console.log("load-smoke: PASS — scanned 0 modules (domain+infra)");
    process.exit(0);
  }

  // Create Vite dev server in middleware mode for SSR loading
  const vite = await createServer({
    configFile: resolve("vite.config.ts"),
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
    logLevel: "silent",
  });

  let loaded = 0;

  try {
    for (const file of modules) {
      try {
        await vite.ssrLoadModule(file);
        loaded++;
      } catch (err) {
        console.error(`load-smoke: FAIL — ${file}`);
        console.error(err);
        await vite.close();
        process.exit(1);
      }
    }

    console.log(`load-smoke: PASS — scanned ${loaded} modules (domain+infra)`);
  } finally {
    await vite.close();
  }
}

main();
