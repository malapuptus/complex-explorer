# Ticket Template

## Ticket XXXX — <Short title>

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

- `node tools/verify.mjs`

**Pre-merge checklist:**

- [ ] All acceptance criteria met
- [ ] All required oracles pass
- [ ] **No out-of-scope edits were made.** If any were necessary, a Scope Exception entry was added to `docs/SCOPE_EXCEPTIONS.md` before merging.
- [ ] **If the ticket introduces a new infra module or pack source,** include the orchestration host + barrel exports in Allowed edits.
- [ ] **Attach raw verify output** (or state verify unavailable) **and include one canary artifact** (CSV header+row or JSON snippet).

---

> **If you need to touch any other file, STOP and ask for a new ticket.**
> Output the exact phrase: **`NEEDS FOLLOW-UP TICKET`** with the file(s) and a minimal ticket proposal.
> Then log the exception in `docs/SCOPE_EXCEPTIONS.md` before continuing.
