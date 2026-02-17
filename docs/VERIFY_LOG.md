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

### 2026-02-17 10:51 (Lovable sandbox)

- **OS:** Lovable sandbox (unknown)
- **Node:** Lovable sandbox (unknown)
- **Command:** `npx vitest run`
- **Result:** PASS (76/76)

<details>
<summary>Output</summary>

PASTE FULL RAW TERMINAL OUTPUT FROM `npx vitest run` HERE

</details>

**Notes:**

- `node tools/verify.mjs` not runnable in Lovable sandbox (reason: <paste exact error if available>).
- These oracles were **NOT RUN** in Lovable for this entry:
  - Repo hygiene: `npx tsx tools/check-hygiene.ts`
  - Format check: `npx prettier --check "src/**/*.{ts,tsx}"`
  - Lint: `npx eslint .`
  - Typecheck: `npx tsc --noEmit`
  - Boundary check: `npx tsx tools/check-boundaries.ts`
  - Load smoke: `node tools/load-smoke.mjs`
  - Build: `npx vite build`

**Canary artifacts (Lovable-only evidence):**

- **CSV header line:** <paste the header line>
- **CSV first data row:** <paste one row showing scoring_version + session_fingerprint populated>
- **Research Bundle snippet (must include these):**
  - provenanceSnapshot: <present/absent>
  - stimulusOrder: <present/absent>
  - seedUsed: <present/absent>
  - scoring.summary: <present/absent>
    <paste a short JSON snippet showing these keys>
- **Break canary (must trigger at least once):**
  - Run demo-10 with `breakEveryN = 2` → expected sequence:
    `scored trial 2 → break screen (once) → resume → scored trial 3`
  - Observed: <paste your observed sequence>

_(newest first)_
