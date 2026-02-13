# Complex Mapper — Project Constitution

## Risk Tier

**B** — personal data, public-facing MVP.

## Rule 0

No product features until Ticket 0000 (this constitution + verify pipeline) is merged.

## Enforceable Rules

### 1. Layer Boundaries

Architecture: `app/ui → domain → infra`. No reverse imports.

| Layer | Directories | May import from |
|-------|------------|-----------------|
| app/ui | `src/components/`, `src/pages/` | domain, infra, external |
| domain | `src/domain/` | external only (pure, no I/O) |
| infra | `src/infra/` | domain, external |

**Enforced by:** `tools/check-boundaries.ts`

### 2. Complexity Budgets

| Metric | Limit | Enforcement |
|--------|-------|-------------|
| File length | ≤ 350 lines | `tools/check-hygiene.ts` |
| Function length | ≤ 60 lines | `tools/check-hygiene.ts` |
| Cyclomatic complexity | ≤ 12 | Deferred (follow-up ticket) |
| No `console.log` in src | — | `tools/check-hygiene.ts` |

### 3. Ticket Discipline

- Every ticket must specify: Goal, Allowed edits (explicit file list), Must NOT, Acceptance criteria, Oracles to run.
- If a needed file isn't listed, **STOP** and propose a new ticket naming it.
- Every ticket must pass the verification pipeline before merging.

### 4. Verification Pipeline

The canonical enforcement gate is `tools/verify` (bash) or `tools/verify.mjs` (cross-platform fallback). All checks run in order and fail fast:

1. Repo hygiene (`check-hygiene`)
2. Format check (`prettier --check`)
3. Lint (`eslint`)
4. Typecheck (`tsc --noEmit`)
5. Boundary check (`check-boundaries`)
6. Build smoke (`vite build`)
7. Unit tests (`vitest`)

> **GitHub Actions / CI gating is deferred** to a future ticket. Until then, `tools/verify` is the sole gate, run locally or inside Lovable.

### 5. Output Requirements

Every ticket output must include:
- List of files changed
- Commands run (verify)
- Risk Card: what we proved vs. didn't prove

## Exceptions

Violations of complexity budgets require a follow-up ticket filed immediately.
