# Local Verification Runbook

> Run the full verify pipeline on your machine before pushing — no CI yet.

## Prerequisites

- **Node.js 20+** (uses `node:fs`, `node:child_process`; SubtleCrypto in tests)
- **npm** (any version bundled with Node 20+)

## Steps

```sh
# 1. Install dependencies (clean install preferred)
npm ci

# 2. Run all 8 oracles
node tools/verify.mjs        # ⚠️ Local only — does NOT run in Lovable
```

That's it. The script fails fast on the first broken oracle.

## What each oracle checks

### Full mode (default) — 10 oracles

| # | Oracle | What it validates | Common failure causes |
|---|--------|-------------------|-----------------------|
| 1 | Repo hygiene | File ≤350 lines, function ≤60 lines, no `console.log` in src | Large files, debug logging left in |
| 2 | Format | Prettier compliance | Forgot to run `npx prettier --write` |
| 3 | Lint | ESLint rules | Unused imports, any-casts |
| 4 | Typecheck | `tsc --noEmit` | Missing types, interface mismatches |
| 5 | Boundaries | Domain cannot import infra or app | Wrong import direction |
| 6 | Load smoke | Vite SSR import of domain + infra modules (skips `*.browser.ts(x)`) | Node-only APIs in browser code; forgot `.browser.ts` suffix on browser-only adapters |
| 7 | Build | `vite build` production bundle | Same as load-smoke, plus chunk/asset errors |
| 8 | Discovery coverage | ≥1 .ts/.tsx file per layer (app/domain/infra) | Missing or empty source layer |
| 9 | Docs freshness | Key docs exist with ≥3 non-empty lines | Stale or missing docs/CURRENT.md, DECISIONS.md, CORE_MODULES.md |
| 10 | Tests | `vitest run` | Broken logic, stale snapshots |

### Fast mode (`--fast`) — 4 oracles

```sh
node tools/verify.mjs --fast   # or: bash tools/verify --fast
```

| # | Oracle | Notes |
|---|--------|-------|
| 1 | Repo hygiene | Same as full |
| 2 | Typecheck | Same as full |
| 3 | Discovery coverage | Same as full |
| 4 | Unit tests | Same as full |

Fast mode emits `VERIFY_FAST PASS` or `VERIFY_FAST FAIL`.
Full mode emits `VERIFY_FULL PASS` or `VERIFY_FULL FAIL`.

Receipts must state which mode ran: `ORACLES_RUN: verify(full)` or `ORACLES_RUN: verify(fast)`.

## Troubleshooting

### `crypto is not defined` / SubtleCrypto errors

The fingerprint module uses `crypto.subtle` (WebCrypto). Node 20+ exposes this globally. If you're on Node 18, ensure `globalThis.crypto` is available — or upgrade to Node 20.

### Boundary violations

The boundary oracle enforces `app → domain → infra` layering. Domain files **must not** import from `infra/` or `app/`. If you need a new domain export, add it to `src/domain/index.ts`.

### Vite build fails but `tsc` passes

Vite tree-shakes differently from `tsc`. Check for side-effect imports or Node-only modules that snuck into browser code.

## Cross-platform notes

- **macOS / Linux:** `bash tools/verify` works (delegates to `verify.mjs`). ⚠️ **Local only.**
- **Windows:** Use `node tools/verify.mjs` directly (the bash wrapper may not work without WSL/Git Bash). ⚠️ **Local only.**

## Proxy verify — `tools/verify-proxy.mjs` ⚠️ Local only

> **This script does NOT run in Lovable.** It requires shell access (`node`, `npx`).
> It is designed for local environments where `verify.mjs` may partially fail.

```sh
node tools/verify-proxy.mjs   # ⚠️ Local only — does NOT run in Lovable
```

This attempts all 8 oracles, catching "command unavailable" errors and printing a summary table with PASS/SKIP/FAIL per oracle.

---

## Lovable Verify Policy

> When working in **Lovable** (sandbox), `verify.mjs` and `verify-proxy.mjs` are **not runnable**. The sandbox only exposes the Vitest test runner. This section defines the minimum verification requirements for Lovable-only work.

### Minimum required commands

| Command | What it covers | How to run in Lovable |
|---------|---------------|----------------------|
| `npx vitest run src` | Oracle 8 (tests) | Via Lovable's test runner |

Oracles 1–7 (hygiene, format, lint, typecheck, boundaries, load-smoke, build) **cannot run** in Lovable. Build correctness is partially confirmed by the Lovable preview loading successfully (covers Oracle 4 typecheck and Oracle 7 build implicitly).

### Required canary artifacts (per ticket close-out)

Every VERIFY_LOG entry must include **all three**:

1. **CSV header + one data row** — proving export columns are intact (can be generated programmatically via exportParity test or from a real session)
2. **Research Bundle snippet** — showing required top-level keys: `sessionResult`, `protocolDocVersion`, `appVersion`, `scoringAlgorithm`, `exportedAt`, `exportSchemaVersion`
3. **Break-trigger proof** — either:
   - breakLogic.test.ts passing output (threshold=2 test), OR
   - Manual observation with breakEveryN=2 showing exactly one break per threshold

### Required "Unrun Oracles" table

Every Lovable VERIFY_LOG entry **must** include the oracle table with columns:

| # | Oracle | Runnable in Lovable | Evidence provided | Notes |
|---|--------|---------------------|-------------------|-------|

Mark each oracle as:
- **Y** — ran and passed (with evidence reference)
- **Y (implicit)** — covered by preview/build success
- **N** — not runnable (state reason)

### Policy checklist (copy into each VERIFY_LOG entry)

```
- [ ] `npx vitest run src` passed (paste raw output)
- [ ] Oracle table included (8 rows, Y/N per oracle)
- [ ] CSV canary: header + one data row pasted
- [ ] Bundle canary: snippet with required keys pasted
- [ ] Break canary: test output or manual observation pasted
- [ ] Environment line present: "Lovable (tests only)" or "Local (full verify)"
```

---

## Canary mode ⚠️ Local only

> **This does NOT run in Lovable.**

To prove the boundary oracle actually catches violations:

```sh
CANARY=1 node tools/verify.mjs   # ⚠️ Local only
```

This creates a temporary illegal import, verifies the oracle rejects it, then cleans up.

---

## Local Pull Readiness Checklist

> Use this when pulling the Lovable project to a local machine for the first time.

### Prerequisites

- **Node.js 20+** (required for `crypto.subtle`, `node:fs`, etc.)
- Verify: `node --version` → must be `v20.x` or higher

### Steps

1. **Clone and install:**
   ```sh
   git clone <repo-url> && cd <repo>
   npm ci
   ```

2. **Run full verify pipeline:**
   ```sh
   node tools/verify.mjs
   ```
   All 8 oracles must pass. If any fail, triage in this order:
   1. **Hygiene** — file too long? Check `docs/SCOPE_EXCEPTIONS.md` for known exceptions
   2. **Format** — run `npx prettier --write "src/**/*.{ts,tsx}"` and retry
   3. **Lint** — fix reported issues, usually unused imports
   4. **Typecheck** — check for missing types or interface mismatches
   5. **Boundaries** — domain must not import infra or app
   6. **Load smoke** — check for browser-only APIs in non-`.browser.ts` files
   7. **Build** — usually same root cause as load-smoke
   8. **Tests** — run `npx vitest run` individually to isolate failures

3. **Run proxy verify (optional comparison):**
   ```sh
   node tools/verify-proxy.mjs
   ```

4. **Compare canary artifacts to Lovable VERIFY_LOG:**
   - Generate a CSV export and compare header + first row to the latest `docs/VERIFY_LOG.md` entry
   - Export a Research Bundle and verify keys match: `sessionResult`, `protocolDocVersion`, `appVersion`, `scoringAlgorithm`, `exportedAt`, `exportSchemaVersion`
   - Run `npx vitest run src/app/__tests__/breakLogic.test.ts` and compare to logged break canary

5. **Run canary mode to validate boundary oracle:**
   ```sh
   CANARY=1 node tools/verify.mjs
   ```

6. **Paste full verify output into `docs/VERIFY_LOG.md`** with environment label "Local (full verify)".
