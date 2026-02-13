# Complex Mapper — Project Constitution

## Risk Tier

**B** — personal data, public-facing MVP.

## Rule 0

No product features until Ticket 0000 (this constitution + verify pipeline) is merged.

## Enforceable Rules

### 1. Layer Boundaries

Architecture: `app → domain → infra`. No reverse imports.

| Layer | Directory | May import from |
|-------|-----------|-----------------|
| app | `src/app/` | domain, infra, external |
| domain | `src/domain/` | external only (pure, no I/O) |
| infra | `src/infra/` | domain, external |

> **Legacy directories** (`src/components/`, `src/pages/`, `src/hooks/`) are treated as **app** layer for backward compatibility. New code must use `src/app/`.

**Enforced by:** `tools/check-boundaries.ts`

**Violation message format:**
```
Boundary violation: <file> (<layer> layer) imports from <target> layer via "<import>" — rule: <layer> cannot import <target>
```

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

### 3a. Process Guard — No Out-of-Scope Edits

If an agent (AI or human) determines during implementation that a file **not listed in the ticket's Allowed edits** must be changed, the agent **MUST**:

1. **STOP** immediately — do not make the edit.
2. Output the exact phrase: **`NEEDS FOLLOW-UP TICKET`**
3. Include:
   - The file(s) that need changing and why.
   - A minimal proposed ticket (Goal + Allowed edits + Must NOT).
4. Resume work on the current ticket **only for in-scope files**.

> **Rationale:** Scope creep is the #1 failure mode. This rule makes the boundary explicit and auditable.
>
> All scope exceptions must be recorded in [`docs/SCOPE_EXCEPTIONS.md`](docs/SCOPE_EXCEPTIONS.md) — this is the canonical ledger.

### 4. Verification Pipeline

The canonical enforcement gate is `tools/verify` (bash) or `tools/verify.mjs` (cross-platform fallback). All checks run in order and fail fast:

1. Repo hygiene (`npx tsx tools/check-hygiene.ts`)
2. Format check (`npx prettier --check`)
3. Lint (`npx eslint .`)
4. Typecheck (`npx tsc --noEmit`)
5. Boundary check (`npx tsx tools/check-boundaries.ts`)
6. Load smoke (`node tools/load-smoke.mjs`)
7. Build (`npx vite build`)
8. Unit tests (`npx vitest run`)

> **GitHub Actions / CI gating is deferred** to a future ticket. Until then, `tools/verify` is the sole gate, run locally or inside Lovable.

### 5. Output Requirements

Every ticket output must include:
- List of files changed
- Commands run (verify)
- Risk Card: what we proved vs. didn't prove

## Exceptions

Violations of complexity budgets require a follow-up ticket filed immediately.
