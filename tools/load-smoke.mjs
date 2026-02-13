#!/usr/bin/env node
/**
 * tools/load-smoke.mjs — Import/load smoke test.
 * Discovers all modules under src/**\/*.{ts,tsx}, excludes tests/mocks/declarations,
 * and attempts to import each one. Fails fast on the first broken module.
 *
 * Usage: node tools/load-smoke.mjs
 */

import { glob } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const patterns = ["src/**/*.ts", "src/**/*.tsx"];
const excludeRe = /(\/__tests__\/|__mocks__|\.test\.|\.d\.ts$)/;

let scanned = 0;

for (const pattern of patterns) {
  for await (const file of glob(pattern)) {
    if (excludeRe.test(file)) continue;
    const abs = resolve(file);
    try {
      await import(pathToFileURL(abs).href);
    } catch (err) {
      console.error(`load-smoke: FAIL — ${file}`);
      console.error(err);
      process.exit(1);
    }
    scanned++;
  }
}

console.log(`load-smoke: scanned ${scanned} modules`);
console.log("load-smoke: PASS");
