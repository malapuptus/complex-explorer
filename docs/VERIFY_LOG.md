# Verify Run Log

> Paste real `node tools/verify.mjs` outputs here as proof the pipeline passes. One entry per run.

---

## Template

Copy this block for each new entry:

```
### YYYY-MM-DD HH:MM (timezone)

- **OS:** e.g. macOS 15.1 / Ubuntu 24.04 / Windows 11
- **Node:** e.g. v20.18.0
- **Command:** `node tools/verify.mjs`
- **Result:** PASS / FAIL

<details>
<summary>Output</summary>

(paste full terminal output here)

</details>

**Notes:** (optional — anything unusual, warnings, skipped steps)
```

---

## Runs

_(newest first)_

### 2026-02-17 11:07 (Lovable sandbox) — Tickets 0168–0172

- **OS:** Lovable sandbox (unknown)
- **Node:** Lovable sandbox (Bun runtime)
- **Command:** `npx vitest run src` (Oracle 8 only — see Ticket 0169 note)
- **Result:** PASS (Oracle 8 — 81/81 tests)

<details>
<summary>Full raw terminal output</summary>

```
$ vitest run src

 RUN  v3.2.4 /dev-server

 ✓ src/domain/__tests__/shuffle.test.ts (8 tests) 10ms
 ✓ src/test/example.test.ts (1 test) 4ms
 ✓ src/domain/__tests__/csvExport.test.ts (3 tests) 5ms
 ✓ src/domain/__tests__/exportParity.test.ts (5 tests) 6ms
 ✓ src/domain/__tests__/fingerprint.test.ts (7 tests) 13ms
 ✓ src/domain/__tests__/stimuli.test.ts (15 tests) 14ms
 ✓ src/domain/__tests__/reflection.test.ts (11 tests) 11ms
 ✓ src/domain/__tests__/scoring.test.ts (19 tests) 15ms
 ✓ src/infra/__tests__/sessionPersistence.test.ts (4 tests) 7ms
 ✓ src/infra/__tests__/draftLock.test.ts (8 tests) 10ms

 Test Files  10 passed (10)
      Tests  81 passed (81)
   Start at  11:07:05
   Duration  3.32s (transform 302ms, setup 2.83s, collect 860ms, tests 94ms, environment 18.12s, prepare 4.89s)
```

</details>

**Oracles NOT executed** (Lovable sandbox does not support arbitrary shell commands — see Ticket 0169):

| Oracle | Command | Status |
|--------|---------|--------|
| 1 — Hygiene | `npx tsx tools/check-hygiene.ts` | NOT RUN |
| 2 — Format | `npx prettier --check "src/**/*.{ts,tsx}"` | NOT RUN |
| 3 — Lint | `npx eslint .` | NOT RUN |
| 4 — Typecheck | `npx tsc --noEmit` | NOT RUN |
| 5 — Boundaries | `npx tsx tools/check-boundaries.ts` | NOT RUN |
| 6 — Load smoke | `node tools/load-smoke.mjs` | NOT RUN |
| 7 — Build | `npx vite build` | NOT RUN |
| 8 — Tests | `npx vitest run` | **PASS** (81/81) |

**Ticket 0169 finding:** The Lovable sandbox exposes only the Vitest test runner. There is no shell access for `node`, `npx`, or `bun` commands. `node tools/verify.mjs` is structurally unrunnable. **Proxy verify procedure:** Run each oracle individually when local shell becomes available; in Lovable, only Oracle 8 (tests) can execute.

### Canary Artifacts (0168–0172)

#### CSV header (unchanged — parity locked by exportParity.test.ts)

```
session_id,session_fingerprint,scoring_version,pack_id,pack_version,seed,order_index,word,warmup,response,t_first_input_ms,t_submit_ms,backspaces,edits,compositions,timed_out,flags
```

#### Research Bundle snippet (now with appVersion populated)

```json
{
  "sessionResult": { "..." : "..." },
  "protocolDocVersion": "PROTOCOL.md@2026-02-13",
  "appVersion": "0.0.0",
  "scoringAlgorithm": "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
  "exportedAt": "2026-02-17T..."
}
```

`appVersion` is now populated from `package.json` via Vite `define` (Ticket 0172).

#### Break logic (Ticket 0170)

Break effect now sets `lastBreakAtRef.current = scoredCompleted` inside the effect body (before `setOnBreak(true)`), preventing double-fire under React Strict Mode. Render condition simplified to `if (onBreak)`.

---

- **OS:** Lovable sandbox (unknown)
- **Node:** Lovable sandbox (unknown — Bun runtime)
- **Command:** `npx vitest run src` (Oracle 8 only)
- **Result:** PASS (Oracle 8 — tests only; see notes for unexecuted oracles)

<details>
<summary>Full raw terminal output</summary>

```
$ vitest run src

 RUN  v3.2.4 /dev-server

 ✓ src/test/example.test.ts (1 test) 3ms
 ✓ src/domain/__tests__/fingerprint.test.ts (7 tests) 13ms
 ✓ src/domain/__tests__/scoring.test.ts (19 tests) 12ms
 ✓ src/domain/__tests__/csvExport.test.ts (3 tests) 4ms
 ✓ src/domain/__tests__/shuffle.test.ts (8 tests) 6ms
 ✓ src/domain/__tests__/stimuli.test.ts (15 tests) 13ms
 ✓ src/domain/__tests__/reflection.test.ts (11 tests) 17ms
 ✓ src/infra/__tests__/sessionPersistence.test.ts (4 tests) 6ms
 ✓ src/infra/__tests__/draftLock.test.ts (8 tests) 7ms

 Test Files  9 passed (9)
      Tests  76 passed (76)
   Start at  10:51:53
   Duration  3.43s (transform 368ms, setup 2.47s, collect 934ms, tests 83ms, environment 16.21s, prepare 5.07s)
```

</details>

**Oracles NOT executed** (Lovable sandbox does not support `node tools/verify.mjs` directly):

| Oracle | Command | Status |
|--------|---------|--------|
| 1 — Hygiene | `npx tsx tools/check-hygiene.ts` | NOT RUN |
| 2 — Format | `npx prettier --check "src/**/*.{ts,tsx}"` | NOT RUN |
| 3 — Lint | `npx eslint .` | NOT RUN |
| 4 — Typecheck | `npx tsc --noEmit` | NOT RUN |
| 5 — Boundaries | `npx tsx tools/check-boundaries.ts` | NOT RUN |
| 6 — Load smoke | `node tools/load-smoke.mjs` | NOT RUN |
| 7 — Build | `npx vite build` | NOT RUN |
| 8 — Tests | `npx vitest run` | **PASS** (76/76) |

`node tools/verify.mjs` was **not runnable** in the Lovable sandbox environment. A local run is required for definitive full-pipeline evidence.

### Canary Artifacts

#### CSV header + first data row

Exported via "Export CSV" button from a completed Demo (10-word) session:

```
session_id,session_fingerprint,scoring_version,pack_id,pack_version,seed,order_index,word,warmup,response,t_first_input_ms,t_submit_ms,backspaces,edits,compositions,timed_out,flags
1739789513229-xxxxxx,b944d97f51dfaa4f47143112f1c4c9a33ae9c71362cd4c7079c98b8b754214b0,scoring_v2_mad_3.5,demo-10,1.0.0,,3,tree,false,night,5749,10869,0,5,0,false,
```

- `scoring_version` column: populated with `scoring_v2_mad_3.5` ✓
- `session_fingerprint` column: populated with SHA-256 hash ✓

#### Research Bundle snippet (top-level keys + required fields)

Exported via "Export Research Bundle" button from the same session:

```json
{
  "sessionResult": {
    "id": "...",
    "config": {
      "stimulusListId": "demo-10",
      "stimulusListVersion": "1.0.0",
      "maxResponseTimeMs": 0,
      "orderPolicy": "fixed",
      "seed": null,
      "breakEveryN": 20
    },
    "trials": [ "... (10 scored trials)" ],
    "scoring": {
      "trialFlags": [ "... (10 entries)" ],
      "summary": {
        "totalTrials": 10,
        "meanReactionTimeMs": 12491,
        "medianReactionTimeMs": 10936,
        "stdDevReactionTimeMs": "...",
        "emptyResponseCount": 0,
        "repeatedResponseCount": 0,
        "timingOutlierCount": "...",
        "highEditingCount": "...",
        "timeoutCount": 0
      }
    },
    "sessionFingerprint": "b944d97f51dfaa4f47143112f1c4c9a33ae9c71362cd4c7079c98b8b754214b0",
    "provenanceSnapshot": { "listId": "demo-10", "listVersion": "1.0.0", "..." : "..." },
    "stimulusOrder": ["tree","house","water","mother","dark","journey","bridge","child","fire","silence"],
    "seedUsed": null,
    "scoringVersion": "scoring_v2_mad_3.5",
    "startedAt": "2026-02-17T...",
    "completedAt": "2026-02-17T..."
  },
  "protocolDocVersion": "PROTOCOL.md@2026-02-13",
  "appVersion": null,
  "scoringAlgorithm": "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
  "exportedAt": "2026-02-17T..."
}
```

Required fields confirmed present:
- `provenanceSnapshot` ✓
- `stimulusOrder` ✓
- `seedUsed` ✓
- `scoring.summary` (all 9 fields) ✓

#### Break sequence observation

Demo pack has 10 words with `DEFAULT_BREAK_EVERY = 20`, so no break triggers during a 10-word session (expected: trial 1 → trial 2 → … → trial 10 → results). Break logic exercised only with packs >20 words or reduced break interval. Observed sequence: `practice 1 → practice 2 → practice 3 → word 1/10 → word 2/10 → … → word 10/10 → results` (no break — correct for 10-word session with breakEvery=20).

---

**Files changed in Tickets 0162–0167:**

| File | Action | Ticket |
|------|--------|--------|
| `src/app/DemoSessionHelpers.ts` | Created | 0162 |
| `src/app/ResumePrompt.tsx` | Created | 0162 |
| `src/app/RunningTrial.tsx` | Created | 0162, 0164 |
| `src/app/DemoSession.tsx` | Edited | 0162 |
| `tools/check-hygiene.ts` | Edited | 0162, 0163 |
| `docs/SCOPE_EXCEPTIONS.md` | Edited | 0162, 0165 |
| `src/infra/localStorageSessionStore.ts` | Edited | 0165 |
| `src/infra/__tests__/sessionPersistence.test.ts` | Created | 0165 |
| `README.md` | Edited | 0166 |
| `docs/VERIFY_LOG.md` | Edited | 0167 |
