

# Ticket 0000: Guardrails First

## Goal
Establish the project's verification pipeline and constitution before any product work begins. One command (`npm run verify`) runs all oracles. CI enforces it on every push/PR.

## Files to Create

| # | Path | Purpose |
|---|------|---------|
| 1 | `tools/check-boundaries.ts` | Dependency boundary checker (app/ui -> domain -> infra, no reverse) |
| 2 | `tools/check-hygiene.ts` | Repo hygiene checks (no console.log in src, max file length 350, max function length 60) |
| 3 | `.github/workflows/verify.yml` | CI workflow: runs `npm run verify` on push and PR |
| 4 | `CONSTITUTION.md` | Enforceable rules and enforcement mechanisms |

## Files to Edit

| # | Path | Change |
|---|------|--------|
| 1 | `package.json` | Add `verify`, `check:boundaries`, `check:hygiene`, `typecheck`, `format:check` scripts |
| 2 | `index.html` | Fix broken `<title>` tag (line 7) |
| 3 | `README.md` | Add "Local Verification Loop" section |

**No other files will be touched.**

## Scripts Added to package.json

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "format:check": "npx prettier --check \"src/**/*.{ts,tsx}\"",
    "check:boundaries": "npx tsx tools/check-boundaries.ts",
    "check:hygiene": "npx tsx tools/check-hygiene.ts",
    "verify": "npm run check:hygiene && npm run format:check && npm run lint && npm run typecheck && npm run check:boundaries && npm run build && npm run test"
  }
}
```

## Oracle Details

The `npm run verify` pipeline runs these checks in order. Any failure stops the pipeline.

| Step | Command | What it checks | PASS | FAIL |
|------|---------|----------------|------|------|
| 1 | `check:hygiene` | No file > 350 lines, no function > 60 lines, no stray `console.log` in src | "Hygiene: PASS" | "Hygiene: FAIL - [reason]" + exit 1 |
| 2 | `format:check` | Prettier formatting consistency | Prettier default output | Exit 1 with diff |
| 3 | `lint` | ESLint rules (already configured) | Clean output | Exit 1 with errors |
| 4 | `typecheck` | TypeScript compilation (`tsc --noEmit`) | Clean output | Exit 1 with type errors |
| 5 | `check:boundaries` | No `domain` imports from `infra` or `app/ui`; no `infra` imports from `app/ui` | "Boundaries: PASS" | "Boundaries: FAIL - [file]: illegal import" + exit 1 |
| 6 | `build` | Vite build succeeds (import/load smoke) | Build output | Exit 1 |
| 7 | `test` | Vitest unit tests | Test results | Exit 1 |

## Technical Details

### tools/check-boundaries.ts
- Uses Node `fs` and `path` to glob `src/**/*.{ts,tsx}`
- Parses import statements with regex
- Enforces: files under `src/domain/` must not import from `src/infra/` or `src/components/` (app/ui layer)
- Enforces: files under `src/infra/` must not import from `src/components/`
- Currently passes vacuously (no domain/infra dirs yet) -- this is intentional; the guardrail is in place for future tickets

### tools/check-hygiene.ts
- Walks `src/**/*.{ts,tsx}` files
- Checks: file line count <= 350
- Checks: no function body exceeds 60 lines (simple brace-counting heuristic)
- Checks: no bare `console.log` (warns; `console.error`/`console.warn` allowed)
- Prints summary and exits 1 on any violation

### .github/workflows/verify.yml
- Triggers on `push` and `pull_request`
- Single job: checkout, setup Node 20, `npm ci`, `npm run verify`

### CONSTITUTION.md
Documents these enforceable rules:
- Risk tier B classification
- Layer boundaries (app/ui -> domain -> infra)
- Complexity budgets (350 lines/file, 60 lines/function, cyclomatic <= 12)
- Every ticket must pass `npm run verify`
- No product features until this ticket merges
- Scope creep rule: unlisted files require a new ticket
- All enforcement mechanisms map to specific oracles

### index.html fix
Line 7 changes from:
```
<title>Complex Mapper</title>Lovable App</title>
```
to:
```
<title>Complex Mapper</title>
```

## What This Proves vs. Does Not Prove

**Proves:**
- All oracles run and pass on current codebase
- CI will block merges that violate any oracle
- Boundary and hygiene rules are machine-enforced

**Does not prove:**
- Cyclomatic complexity check (deferred -- would require a heavier tool like `eslint-plugin-complexity`; flagged for follow-up ticket)
- End-to-end coverage of domain/infra boundaries (no domain/infra code exists yet; passes vacuously)

