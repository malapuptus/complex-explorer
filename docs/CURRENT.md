# CURRENT — Complex Mapper

LAST_UPDATED: 2026-02-18
RISK_TIER: B (MVP to users)

STATUS (1–3 lines)

- App is end-to-end complete for sessions + analysis + exports; test suite passing.

LAST_BATCH

- BATCH: T\_**\_-T\_\_** | <short note>
- DATE: YYYY-MM-DD
- VERIFY_PROVENANCE: (paste ONE of the following)
  - VERIFY_OUTPUT_SNIPPET: VERIFY_FULL PASS ... (or VERIFY_FAST PASS/FAIL ...)
  - VERIFY_LAST_FILE: VERIFY_FULL PASS 2026-**-**T**:**:\_\_Z (from .cache/verify-last.txt)

NOW (Top 3 priorities)

1. ***
2. ***
3. ***

NEXT (Smallest verifiable steps)

- [ ] ***
- [ ] ***
- [ ] ***

RISKS / WATCHLIST

- Verify runtime creep (keep verify(full) fast enough to run every batch).
- Drift risk: update docs/PROJECT_SUMMARY.md when core invariants change.

HOW TO VERIFY (repo truth)

- Preferred: bash tools/verify
- Fallback: node tools/verify.mjs
