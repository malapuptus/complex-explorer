

# Ticket Format + Guardrails Recap

## Ticket Template Headings (exact)

```
## Ticket XXXX — <Short title>

**Goal (1 sentence):**

**Allowed edits (explicit file list):**

**Must NOT:**

**Acceptance criteria:**

**Required oracles:**

**Pre-merge checklist:**
```

## Verification Pipeline (8 oracles, fail-fast)

| # | Oracle | Command |
|---|--------|---------|
| 1 | Repo hygiene | `npx tsx tools/check-hygiene.ts` |
| 2 | Format check | `npx prettier --check "src/**/*.{ts,tsx}"` |
| 3 | Lint | `npx eslint .` |
| 4 | Typecheck | `npx tsc --noEmit` |
| 5 | Boundary check | `npx tsx tools/check-boundaries.ts` |
| 6 | Load smoke | `node tools/load-smoke.mjs` |
| 7 | Build | `npx vite build` |
| 8 | Unit tests | `npx vitest run` |

Run all at once: `node tools/verify.mjs`

---

# Tickets 0157--0161

---

## Ticket 0157 --- Persist scoringVersion in SessionResult

**Goal (1 sentence):**
Persist `scoringVersion` on every saved `SessionResult` so that bulk CSV export via `sessionResultsToCsv` populates the `scoring_version` column for all sessions (including migrated legacy sessions).

**Allowed edits (explicit file list):**

- `src/app/DemoSession.tsx` (add `scoringVersion` to the `SessionResult` object built at save time)
- `src/infra/localStorageSessionStore.ts` (add `scoringVersion` default in `migrateSessionToV3`)
- `src/domain/__tests__/csvExport.test.ts` (adjust test fixtures to include `scoringVersion` on `SessionResult` if testing `sessionResultsToCsv`)

**Must NOT:**

- No changes to scoring logic or `scoring.ts`
- No changes to `src/domain/types.ts` (field already exists as optional)
- No new dependencies

**Acceptance criteria:**

1. `DemoSession.tsx` sets `scoringVersion: "scoring_v2_mad_3.5"` on the `SessionResult` object before calling `localStorageSessionStore.save()`.
2. `migrateSessionToV3` in `localStorageSessionStore.ts` defaults `scoringVersion` to `null` for legacy sessions that lack it.
3. Bulk CSV export from Previous Sessions page (`sessionResultsToCsv`) produces a populated `scoring_version` column for newly saved sessions and an empty string for legacy sessions.
4. `node tools/verify.mjs` passes.

**Required oracles:**

- `node tools/verify.mjs`

**Pre-merge checklist:**

- [ ] All acceptance criteria met
- [ ] All required oracles pass
- [ ] **No out-of-scope edits were made.** If any were necessary, a Scope Exception entry was added to `docs/SCOPE_EXCEPTIONS.md` before merging.

**Migration/backward-compat notes:**
- The `scoringVersion` field on `SessionResult` in `types.ts` is already `string | null | undefined`. Legacy sessions migrated by `migrateSessionToV3` will get `scoringVersion: null`, which `csvExport.ts` already handles (outputs empty string).

**QA validation:**
- Complete a demo session. Go to Previous Sessions. Export CSV. Confirm `scoring_version` column contains `scoring_v2_mad_3.5` for the new session.

---

## Ticket 0158 --- Fix startedAt to record true session start

**Goal (1 sentence):**
Record `startedAt` at true session start time (not completion time) and persist it through draft/resume so that `startedAt < completedAt` always holds.

**Allowed edits (explicit file list):**

- `src/app/DemoSession.tsx` (capture start timestamp; include it in draft; use it when building `SessionResult`)
- `src/domain/sessionStore.ts` (add `startedAt` field to `DraftSession` interface)

**Must NOT:**

- No scoring changes
- No infra persistence changes (store shape is fine; field is added to the draft interface only)
- No changes to `useSession.ts`

**Acceptance criteria:**

1. A `startedAtRef` (or equivalent) is set to `new Date().toISOString()` when `handleStart` fires and when `handleResume` restores from a draft that already has `startedAt`.
2. `DraftSession` interface includes `readonly startedAt?: string` so the timestamp survives refresh/resume.
3. The `SessionResult` built at save time uses the captured `startedAt`, not `new Date().toISOString()`.
4. For any completed session, `new Date(startedAt) < new Date(completedAt)` is true.
5. `node tools/verify.mjs` passes.

**Required oracles:**

- `node tools/verify.mjs`

**Pre-merge checklist:**

- [ ] All acceptance criteria met
- [ ] All required oracles pass
- [ ] **No out-of-scope edits were made.** If any were necessary, a Scope Exception entry was added to `docs/SCOPE_EXCEPTIONS.md` before merging.

**Migration/backward-compat notes:**
- `startedAt` on `DraftSession` is optional (`?`). Existing drafts without it will use current time on resume (graceful fallback). `migrateDraft` in `localStorageSessionStore.ts` already passes through unknown fields, but since `startedAt` is optional, no infra migration code is needed (it will just be `undefined` for old drafts).

**QA validation:**
- Start a session. Refresh mid-session. Resume. Complete. In Previous Sessions, export JSON and confirm `startedAt` is earlier than `completedAt`.

---

## Ticket 0159 --- Pass full reproducibility metadata from PreviousSessions to ResultsView

**Goal (1 sentence):**
When viewing a historical session in PreviousSessions, pass the complete `csvMeta` (fingerprint, orderPolicy, timeout, breakEveryN, seed, scoringVersion) to `ResultsView` so the Reproducibility Bundle panel and exports are fully populated.

**Allowed edits (explicit file list):**

- `src/app/PreviousSessions.tsx` (expand the `csvMeta` object passed to `ResultsView`)

**Must NOT:**

- No changes to `ResultsView.tsx` (it already accepts all these fields)
- No domain or infra changes
- No new dependencies

**Acceptance criteria:**

1. `PreviousSessions` passes `sessionFingerprint`, `orderPolicy`, `trialTimeoutMs`, `breakEveryN`, and `packVersion` from the loaded `SessionResult` into `csvMeta`.
2. When viewing a historical session, the Reproducibility Bundle panel shows fingerprint, order policy, scoring version, and timeout/break values (or their defaults).
3. CSV export from a historical session view includes `scoring_version` and `session_fingerprint`.
4. `node tools/verify.mjs` passes.

**Required oracles:**

- `node tools/verify.mjs`

**Pre-merge checklist:**

- [ ] All acceptance criteria met
- [ ] All required oracles pass
- [ ] **No out-of-scope edits were made.** If any were necessary, a Scope Exception entry was added to `docs/SCOPE_EXCEPTIONS.md` before merging.

**Migration/backward-compat notes:**
- Legacy sessions without `sessionFingerprint` or `config.trialTimeoutMs` will show `n/a` or omit those rows in the panel, which is the existing behavior of `ResultsView`.

**QA validation:**
- Complete a seeded session with timeout enabled. Go to Previous Sessions. Click on it. Confirm the Reproducibility Bundle shows fingerprint, seed, order policy, timeout, and break interval.

---

## Ticket 0160 --- Research Bundle export based on persisted SessionResult

**Goal (1 sentence):**
When exporting a Research Bundle from PreviousSessions (historical view), base it on the full persisted `SessionResult` object rather than partial reconstruction from `csvMeta` props.

**Allowed edits (explicit file list):**

- `src/app/ResultsView.tsx` (accept optional `sessionResult` prop; use it to populate bundle when available)
- `src/app/PreviousSessions.tsx` (pass the loaded `SessionResult` to `ResultsView`)

**Must NOT:**

- No domain or infra changes
- No scoring changes
- No new routes

**Acceptance criteria:**

1. `ResultsView` accepts an optional `sessionResult?: SessionResult` prop.
2. When `sessionResult` is provided, the "Export Research Bundle" button uses its full data (all config fields, all trials, full scoring object with summary stats, provenance snapshot, fingerprint).
3. When `sessionResult` is not provided (live session in DemoSession), behavior is unchanged (reconstructs from `csvMeta`).
4. The exported bundle JSON from a historical session contains `provenanceSnapshot`, `stimulusOrder`, `seedUsed`, and all `scoring.summary` fields.
5. `node tools/verify.mjs` passes.

**Required oracles:**

- `node tools/verify.mjs`

**Pre-merge checklist:**

- [ ] All acceptance criteria met
- [ ] All required oracles pass
- [ ] **No out-of-scope edits were made.** If any were necessary, a Scope Exception entry was added to `docs/SCOPE_EXCEPTIONS.md` before merging.

**QA validation:**
- Complete a session. View it in Previous Sessions. Export Research Bundle. Confirm it contains `provenanceSnapshot`, full `scoring.summary` (all 9 fields), and `stimulusOrder`.

---

## Ticket 0161 --- Resolve constitution vs hygiene threshold drift

**Goal (1 sentence):**
Align `tools/check-hygiene.ts` thresholds with `CONSTITUTION.md` limits (350 lines/file, 60 lines/function) to restore guardrails credibility.

**Allowed edits (explicit file list):**

- `tools/check-hygiene.ts` (change `MAX_FILE_LINES` from 900 to 350, `MAX_FUNC_LINES` from 450 to 60)
- `docs/SCOPE_EXCEPTIONS.md` (document any files that currently exceed the tightened limits as known violations with follow-up tickets)

**Must NOT:**

- No `src/` changes in this ticket
- No changes to `CONSTITUTION.md`
- No changes to other tools

**Acceptance criteria:**

1. `MAX_FILE_LINES = 350` and `MAX_FUNC_LINES = 60` in `tools/check-hygiene.ts`.
2. If any existing files violate the new limits (e.g., `DemoSession.tsx` at ~442 lines), they are listed in `docs/SCOPE_EXCEPTIONS.md` with a note that a follow-up decomposition ticket is required.
3. The hygiene oracle reports these violations. (Note: verify.mjs will FAIL until the violating files are split. This is intentional -- the exception log documents the known debt.)
4. Alternatively, if immediate compliance is preferred: add a temporary allowlist mechanism in `check-hygiene.ts` for files documented in `SCOPE_EXCEPTIONS.md`, with a TODO to remove entries as files are split.

**Required oracles:**

- `node tools/verify.mjs` (expected to fail on hygiene until violating files are split -- document this in the scope exception entry)

**Pre-merge checklist:**

- [ ] All acceptance criteria met
- [ ] All required oracles pass (or failures are documented as known exceptions)
- [ ] **No out-of-scope edits were made.** If any were necessary, a Scope Exception entry was added to `docs/SCOPE_EXCEPTIONS.md` before merging.

**Migration/backward-compat notes:**
- This ticket will likely cause `verify.mjs` to fail on step 1 (hygiene) until `DemoSession.tsx` is decomposed. The recommended approach is: (a) tighten thresholds, (b) add a temporary allowlist for documented exceptions, (c) file Ticket 0162 to split `DemoSession.tsx` below 350 lines.

**QA validation:**
- Run `npx tsx tools/check-hygiene.ts`. Confirm it reports violations for files over 350 lines. Confirm the allowlist (if added) suppresses documented exceptions. Confirm `SCOPE_EXCEPTIONS.md` lists every excepted file.

---

# Recommended Execution Order

| Priority | Ticket | Dependency |
|----------|--------|------------|
| 1st | 0157 | None (data integrity) |
| 2nd | 0158 | None (data integrity) |
| 3rd | 0159 | Benefits from 0157 (scoring_version populated) |
| 4th | 0160 | Benefits from 0159 (full metadata available) |
| 5th | 0161 | Independent, but will break verify until follow-up decomposition ticket |

