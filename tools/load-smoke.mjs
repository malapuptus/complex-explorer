#!/usr/bin/env node
/**
 * tools/load-smoke.mjs — Import/load smoke test via Vite SSR.
 * Discovers all modules under src/**\/*.{ts,tsx}, excludes tests/mocks/declarations,
 * and loads each one through Vite's SSR transform. Fails fast on first broken module.
 *
 * Works on Node 18/20+ (no glob from node:fs/promises).
 *
 * Usage: node tools/load-smoke.mjs
 */

import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer } from "vite";

const SRC = resolve("src");
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
  // Discover modules
  let files;
  try {
    files = await walk(SRC);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("load-smoke: PASS (loaded 0 modules)");
      process.exit(0);
    }
    throw err;
  }

  // Filter out non-runtime files
  const modules = files.filter((f) => !EXCLUDE_RE.test(f));

  if (modules.length === 0) {
    console.log("load-smoke: PASS (loaded 0 modules)");
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

    console.log(`load-smoke: PASS (loaded ${loaded} modules)`);
  } finally {
    await vite.close();
  }
}

main();
