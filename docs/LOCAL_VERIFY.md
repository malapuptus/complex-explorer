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
node tools/verify.mjs
```

That's it. The script fails fast on the first broken oracle.

## What each oracle checks

| # | Oracle | What it validates | Common failure causes |
|---|--------|-------------------|-----------------------|
| 1 | Repo hygiene | File ≤350 lines, function ≤60 lines, no `console.log` in src | Large files, debug logging left in |
| 2 | Format | Prettier compliance | Forgot to run `npx prettier --write` |
| 3 | Lint | ESLint rules | Unused imports, any-casts |
| 4 | Typecheck | `tsc --noEmit` | Missing types, interface mismatches |
| 5 | Boundaries | Domain cannot import infra or app | Wrong import direction |
| 6 | Load smoke | Vite SSR import of domain + infra modules (skips `*.browser.ts(x)`) | Node-only APIs in browser code; forgot `.browser.ts` suffix on browser-only adapters |
| 7 | Build | `vite build` production bundle | Same as load-smoke, plus chunk/asset errors |
| 8 | Tests | `vitest run` | Broken logic, stale snapshots |

## Troubleshooting

### `crypto is not defined` / SubtleCrypto errors

The fingerprint module uses `crypto.subtle` (WebCrypto). Node 20+ exposes this globally. If you're on Node 18, ensure `globalThis.crypto` is available — or upgrade to Node 20.

### Boundary violations

The boundary oracle enforces `app → domain → infra` layering. Domain files **must not** import from `infra/` or `app/`. If you need a new domain export, add it to `src/domain/index.ts`.

### Vite build fails but `tsc` passes

Vite tree-shakes differently from `tsc`. Check for side-effect imports or Node-only modules that snuck into browser code.

## Cross-platform notes

- **macOS / Linux:** `bash tools/verify` works (delegates to `verify.mjs`).
- **Windows:** Use `node tools/verify.mjs` directly (the bash wrapper may not work without WSL/Git Bash).

## Proxy verify (Lovable / restricted environments)

When `node tools/verify.mjs` is unavailable (e.g. Lovable sandbox), use the proxy runner:

```sh
node tools/verify-proxy.mjs
```

This attempts all 8 oracles, catching "command unavailable" errors and printing a summary table with PASS/SKIP/FAIL per oracle. In Lovable, only Oracle 8 (tests via `npx vitest run`) is expected to run; the rest will show SKIP.

## Canary mode

To prove the boundary oracle actually catches violations:

```sh
CANARY=1 node tools/verify.mjs
```

This creates a temporary illegal import, verifies the oracle rejects it, then cleans up.
