# Ticket Template

## Ticket XXXX — <Short title>

**CAPABILITY:** `EXECUTABLE` | `EDITOR_ONLY`  _(delete one)_

**BATCH:** `T####-T####` | _<short note on what this batch covers>_

**Goal (1 sentence):**
<What this ticket achieves.>

**Allowed edits (explicit file list):**

- `src/...`
- `src/...`

**Must NOT:**

- <Constraint 1>
- <Constraint 2>

**Acceptance criteria:**

1. <Criterion 1>
2. <Criterion 2>

**Required oracles:**

- `bash tools/verify` (preferred) OR `node tools/verify.mjs` (cross-platform fallback)
- If using fast/full modes, receipt must state which ran.

**Verify receipt (paste output):**

```
VERIFY_HYGIENE: PASS/FAIL/SKIP
VERIFY_FORMAT:  PASS/FAIL/SKIP
VERIFY_LINT:    PASS/FAIL/SKIP
VERIFY_TYPE:    PASS/FAIL/SKIP
VERIFY_BOUNDS:  PASS/FAIL/SKIP
VERIFY_SMOKE:   PASS/FAIL/SKIP
VERIFY_BUILD:   PASS/FAIL/SKIP
VERIFY_TESTS:   PASS/FAIL/SKIP (N tests)
```

**Pre-merge checklist:**

- [ ] All acceptance criteria met
- [ ] All required oracles pass
- [ ] **Receipt/provenance included:** VERIFY_* PASS/FAIL line (or verify-last line if implemented).
- [ ] **No out-of-scope edits were made.** If any were necessary, a Scope Exception entry was added to `docs/SCOPE_EXCEPTIONS.md` before merging.
- [ ] **If the ticket introduces a new infra module or pack source,** include the orchestration host + barrel exports in Allowed edits.
- [ ] **Attach raw verify output** (or state verify unavailable) **and include one canary artifact** (CSV header+row or JSON snippet).

---

> **If you need to touch any other file, STOP and ask for a new ticket.**
> Output the exact phrase: **`NEEDS FOLLOW-UP TICKET`** with the file(s) and a minimal ticket proposal.
> Then log the exception in `docs/SCOPE_EXCEPTIONS.md` before continuing.

