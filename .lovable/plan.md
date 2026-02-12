

# Ticket 0000A: Guardrails Repair

## Goal
Bring the repo into conformance with the Guardrails-First contract. Add a canonical `./tools/verify` shell entrypoint, missing config files, and align CI. No renames, no product features.

## Current State
- `tools/check-boundaries.ts` and `tools/check-hygiene.ts` exist and work
- `.github/workflows/verify.yml` exists but calls steps individually (not a single entrypoint)
- `eslint.config.js` (flat config) exists -- we will NOT replace it; no `.eslintrc.cjs` needed
- No `.prettierrc`, `.prettierignore`, `.editorconfig`
- `package.json` has no `verify` script (and may be read-only in Lovable)
- `CONSTITUTION.md` and `README.md` already updated from Ticket 0000

## Files to Create

| # | Path | Purpose |
|---|------|---------|
| 1 | `tools/verify` | Bash script -- canonical single entrypoint for all oracles |
| 2 | `.prettierrc` | Prettier config (consistent formatting rules) |
| 3 | `.prettierignore` | Exclude dist, node_modules, lockfiles from formatting |
| 4 | `.editorconfig` | Editor-neutral whitespace/encoding settings |

## Files to Edit

| # | Path | Change |
|---|------|--------|
| 1 | `package.json` | Add `"verify"` script (see variant handling below) |
| 2 | `.github/workflows/verify.yml` | Simplify to call `./tools/verify` instead of individual steps |

**No other files will be touched.** Existing `tools/check-boundaries.ts`, `tools/check-hygiene.ts`, `eslint.config.js`, `CONSTITUTION.md`, `README.md` are kept as-is.

## package.json Read-Only Handling

**Variant A (preferred):** Edit `package.json` to add:
```json
"verify": "bash tools/verify"
```
This makes `npm run verify` work.

**Variant B (fallback):** If `package.json` is read-only, `./tools/verify` is the canonical entrypoint. CI calls it directly. README documents `bash tools/verify` as the local command. `npm run verify` is noted as unavailable until package.json can be edited externally.

The plan implements Variant A first and falls back to Variant B if the edit fails.

## tools/verify (Bash Script)

```text
#!/usr/bin/env bash
set -euo pipefail

echo "=== [1/7] Repo hygiene ==="
npx tsx tools/check-hygiene.ts
echo ""

echo "=== [2/7] Format check ==="
npx prettier --check "src/**/*.{ts,tsx}"
echo ""

echo "=== [3/7] Lint ==="
npm run lint
echo ""

echo "=== [4/7] Typecheck ==="
npx tsc --noEmit
echo ""

echo "=== [5/7] Boundary check ==="
npx tsx tools/check-boundaries.ts
echo ""

echo "=== [6/7] Build (load smoke) ==="
npm run build
echo ""

echo "=== [7/7] Unit tests ==="
npm run test
echo ""

echo "==============================="
echo "VERIFY: ALL CHECKS PASSED"
echo "==============================="
```

Each step uses `set -e` so any failure exits immediately with a non-zero code. PASS/FAIL output:
- Individual steps print their own output (e.g. "Hygiene: PASS", "Boundaries: PASS")
- On success: final banner "VERIFY: ALL CHECKS PASSED"
- On failure: script exits at the failing step with that step's error output

## .github/workflows/verify.yml (updated)

```text
name: Verify

on:
  push:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: chmod +x tools/verify && bash tools/verify
```

Single step calls the canonical entrypoint.

## .prettierrc

```text
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

## .prettierignore

```text
dist
node_modules
bun.lockb
package-lock.json
*.tsbuildinfo
```

## .editorconfig

```text
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

## Verify Pipeline Steps (Summary)

| Step | Oracle | PASS | FAIL |
|------|--------|------|------|
| 1 | Repo hygiene (check-hygiene.ts) | "Hygiene: PASS" | "Hygiene: FAIL" + exit 1 |
| 2 | Prettier format check | Clean exit | Exit 1 with diff |
| 3 | ESLint | Clean exit | Exit 1 with errors |
| 4 | TypeScript typecheck | Clean exit | Exit 1 with type errors |
| 5 | Boundaries (check-boundaries.ts) | "Boundaries: PASS" | "Boundaries: FAIL" + exit 1 |
| 6 | Vite build (load smoke) | Build succeeds | Exit 1 |
| 7 | Vitest unit tests | Tests pass | Exit 1 |
| Final | All passed | "VERIFY: ALL CHECKS PASSED" | (never reached) |

## What This Proves vs. Does Not Prove

**Proves:**
- Single canonical entrypoint (`./tools/verify`) runs all oracles
- CI uses the same entrypoint
- Prettier and editor configs are explicit and committed
- Existing tooling (check-hygiene, check-boundaries, eslint flat config) is preserved without renames

**Does not prove:**
- `npm run verify` works (depends on package.json editability -- Variant B covers this)
- Cyclomatic complexity enforcement (deferred from Ticket 0000)

