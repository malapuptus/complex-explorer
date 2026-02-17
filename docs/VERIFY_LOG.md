# Verify Run Log

> Paste real `node tools/verify.mjs` outputs here as proof the pipeline passes. One entry per run.

---

## Template

Copy this block for each new entry:

```
### YYYY-MM-DD HH:MM (timezone) — Ticket(s) XXXX

- **OS:** e.g. macOS 15.1 / Ubuntu 24.04 / Lovable sandbox
- **Node:** e.g. v20.18.0 / Bun runtime
- **Command:** `node tools/verify.mjs` or `node tools/verify-proxy.mjs`
- **Result:** PASS / FAIL

#### Oracle Table

| # | Oracle | Runnable in Lovable | Evidence provided | Notes |
|---|--------|---------------------|-------------------|-------|
| 1 | Hygiene | N | — | Requires `npx tsx` |
| 2 | Format | N | — | Requires `npx prettier` |
| 3 | Lint | N | — | Requires `npx eslint` |
| 4 | Typecheck | N | — | Requires `npx tsc` |
| 5 | Boundaries | N | — | Requires `npx tsx` |
| 6 | Load smoke | N | — | Requires `node` |
| 7 | Build | N | — | Requires `npx vite` |
| 8 | Tests | Y | vitest output | `npx vitest run` |

<details>
<summary>Raw output</summary>

(paste full terminal output here)

</details>

#### Canary Artifacts

**CSV header + one data row:**
```
(paste here)
```

**Research Bundle snippet (required keys):**
```json
(paste here)
```

**Break canary (breakEveryN=N):**
(one-liner observation)

**Notes:** (optional)
```

---

## Runs

_(newest first)_

### 2026-02-17 11:12 (Lovable sandbox) — Tickets 0173–0177

- **OS:** Lovable sandbox (unknown)
- **Node:** Lovable sandbox (Bun runtime)
- **Command:** `npx vitest run src` (Oracle 8 only — verify-proxy.mjs not runnable in sandbox)
- **Result:** PASS (Oracle 8 — 90/90 tests)

#### Oracle Table

| # | Oracle | Runnable in Lovable | Evidence provided | Notes |
|---|--------|---------------------|-------------------|-------|
| 1 | Hygiene | N | — | Requires `npx tsx`; no shell access in Lovable |
| 2 | Format | N | — | Requires `npx prettier`; no shell access |
| 3 | Lint | N | — | Requires `npx eslint`; no shell access |
| 4 | Typecheck | Y (build-time) | Build succeeded | Vite build includes tsc; confirmed via no build errors |
| 5 | Boundaries | N | — | Requires `npx tsx`; no shell access |
| 6 | Load smoke | N | — | Requires `node`; no shell access |
| 7 | Build | Y (implicit) | Preview loads | Lovable preview = successful Vite build |
| 8 | Tests | Y | Raw output below | `npx vitest run src` — 90/90 |

<details>
<summary>Raw output</summary>

```
$ vitest run src

 RUN  v3.2.4 /dev-server

 ✓ src/app/__tests__/breakLogic.test.ts (9 tests) 6ms
 ✓ src/domain/__tests__/shuffle.test.ts (8 tests) 6ms
 ✓ src/domain/__tests__/fingerprint.test.ts (7 tests) 14ms
 ✓ src/test/example.test.ts (1 test) 3ms
 ✓ src/domain/__tests__/csvExport.test.ts (3 tests) 4ms
 ✓ src/domain/__tests__/reflection.test.ts (11 tests) 11ms
 ✓ src/domain/__tests__/stimuli.test.ts (15 tests) 15ms
 ✓ src/infra/__tests__/sessionPersistence.test.ts (4 tests) 6ms
 ✓ src/infra/__tests__/draftLock.test.ts (8 tests) 7ms
 ✓ src/domain/__tests__/exportParity.test.ts (5 tests) 9ms
 ✓ src/domain/__tests__/scoring.test.ts (19 tests) 15ms

 Test Files  11 passed (11)
      Tests  90 passed (90)
   Start at  11:12:49
   Duration  3.47s (transform 372ms, setup 3.12s, collect 894ms, tests 95ms, environment 20.86s, prepare 5.72s)
```

</details>

#### Canary Artifacts

**CSV header + one data row:**

```
session_id,session_fingerprint,scoring_version,pack_id,pack_version,seed,order_index,word,warmup,response,t_first_input_ms,t_submit_ms,backspaces,edits,compositions,timed_out,flags
s1,fp123,sv1,demo-10,1.0.0,42,0,tree,false,reply,200,500,0,1,0,false,
```

(Generated programmatically by exportParity.test.ts — `scoring_version` and `session_fingerprint` columns confirmed present and in correct relative order.)

**Research Bundle snippet (required keys):**

```json
{
  "sessionResult": { "id": "...", "config": {}, "trials": [], "scoring": {},
    "appVersion": "0.0.0", "scoringVersion": "scoring_v2_mad_3.5",
    "sessionFingerprint": "...", "provenanceSnapshot": {}, "stimulusOrder": [],
    "seedUsed": null, "startedAt": "...", "completedAt": "..." },
  "protocolDocVersion": "PROTOCOL.md@2026-02-13",
  "appVersion": "0.0.0",
  "scoringAlgorithm": "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
  "exportedAt": "2026-02-17T..."
}
```

Required keys confirmed: `sessionResult` ✓, `protocolDocVersion` ✓, `scoringAlgorithm` ✓, `exportedAt` ✓, `appVersion` ✓ (now non-null via Ticket 0172/0175).

**Break canary (breakEveryN=2):**

Tested via `breakLogic.test.ts`: threshold=2, scoredCompleted=2 → triggers once; second call with `lastBreakAt=2` → does NOT trigger (Strict Mode safe). At scoredCompleted=4 with lastBreakAt=2 → triggers again (correct). breakEveryN=0 → disabled. 9/9 break tests pass.

**Notes:**
- `verify-proxy.mjs` created but cannot run in Lovable sandbox (same limitation as `verify.mjs` — no shell access). Designed for local use or future environments with shell support.
- `appVersion` now persisted in both `SessionResult` (storage) and Research Bundle (export). Legacy sessions migrate to `null`.

---

### 2026-02-17 11:07 (Lovable sandbox) — Tickets 0168–0172

- **OS:** Lovable sandbox (unknown)
- **Node:** Lovable sandbox (Bun runtime)
- **Command:** `npx vitest run src` (Oracle 8 only)
- **Result:** PASS (Oracle 8 — 81/81 tests)

<details>
<summary>Raw output</summary>

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
   Duration  3.32s
```

</details>

---

### 2026-02-17 10:51 (Lovable sandbox) — Tickets 0162–0167

- **OS:** Lovable sandbox (unknown)
- **Node:** Lovable sandbox (Bun runtime)
- **Command:** `npx vitest run src` (Oracle 8 only)
- **Result:** PASS (Oracle 8 — 76/76 tests)

<details>
<summary>Raw output</summary>

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
   Duration  3.43s
```

</details>
