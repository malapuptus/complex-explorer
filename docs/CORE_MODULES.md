# Core Modules — Complex Mapper

> Deterministic list of modules whose correctness is load-bearing.
> Changes to any of these require extra scrutiny (tests + Risk Card).

---

## Verification Pipeline

| Module                      | Role                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `tools/verify`              | Bash entry point — delegates to verify.mjs                                                              |
| `tools/verify.mjs`          | Canonical 8-oracle gate (hygiene → format → lint → typecheck → boundaries → load-smoke → build → tests) |
| `tools/verify-proxy.mjs`    | Lovable-sandbox-compatible proxy; runs available oracles, SKIPs unavailable ones                        |
| `tools/check-boundaries.ts` | Enforces app→domain→infra layer rules; fails on any reverse import                                      |
| `tools/check-hygiene.ts`    | Enforces ≤350 lines/file, ≤60 lines/function, no console.log in src/                                    |
| `tools/load-smoke.mjs`      | Smoke-loads domain barrel; verifies no top-level side effects break import                              |

---

## Layer Roots

| Path              | Layer        | Notes                                      |
| ----------------- | ------------ | ------------------------------------------ |
| `src/app/`        | app          | React components + hooks + orchestration   |
| `src/domain/`     | domain       | Pure logic, no I/O                         |
| `src/infra/`      | infra        | Storage adapters (localStorage)            |
| `src/components/` | app (legacy) | shadcn/ui components; treated as app layer |
| `src/pages/`      | app (legacy) | React Router pages                         |
| `src/hooks/`      | app (legacy) | Shared hooks                               |

---

## Domain Modules (load-bearing)

| Module                            | Exports                                                             | Notes                                                               |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/domain/scoring.ts`           | `scoreSession`                                                      | MAD-based outlier detection; must not change thresholds without ADR |
| `src/domain/sessionInsights.ts`   | `buildSessionInsights`, `computeQualityIndex`, `getMicroGoal`       | Pure analytics; deterministic                                       |
| `src/domain/indicators.ts`        | `IndicatorCode`, `mergeTrialIndicators`, `aggregateIndicatorCounts` | Unified flag+CI system                                              |
| `src/domain/ciCodes.ts`           | `computeCiCodes`                                                    | CI code generation                                                  |
| `src/domain/fingerprint.ts`       | `computeFingerprint`                                                | Session deduplication                                               |
| `src/domain/shuffle.ts`           | `seededShuffle`, `mulberry32`                                       | Deterministic PRNG                                                  |
| `src/domain/stimuli/integrity.ts` | `EXPECTED_HASHES`, `computeWordsSha256`                             | Pack hash freeze                                                    |
| `src/domain/csvExport.ts`         | `buildCsvRows`, `buildCsvHeader`                                    | CSV export determinism                                              |
| `src/domain/snapshotNormalize.ts` | `normalizeSnapshot`                                                 | Bundle completeness invariant                                       |
| `src/domain/simulateSession.ts`   | `simulateSession`                                                   | Dev-only deterministic session generator                            |

---

## Infra Modules

| Module                                      | Exports                                 | Notes                              |
| ------------------------------------------- | --------------------------------------- | ---------------------------------- |
| `src/infra/localStorageSessionStore.ts`     | `LocalStorageSessionStore`              | Atomic write (staging-key pattern) |
| `src/infra/localStorageStimulusStore.ts`    | `LocalStorageStimulusStore`             | Atomic write for packs             |
| `src/infra/localStorageTrialAnnotations.ts` | `getAnnotations`, `setManualIndicators` | Manual + auto annotation store     |
| `src/infra/localStorageUiPrefs.ts`          | `getUiPrefs`, `setBaselineSessionId`    | Baseline session preference        |
| `src/infra/storageReport.ts`                | `buildStorageReport`                    | localStorage usage summary         |

---

## Test Fixtures

| File                                           | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `src/test/fixtures/pkg_v1_full_small.json`     | Full session package (3 scored trials: tree/420, house/380, water/510) |
| `src/test/fixtures/pkg_v1_redacted_small.json` | Redacted variant of the above                                          |

---

## Continuity Docs (process-load-bearing)

| File                        | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `docs/AI_CODING_OS_v3.3.md` | Canonical OS prompts (Prompt A + Prompt B)         |
| `docs/TICKET_TEMPLATE.md`   | Ticket format + STOP rules + evidence requirements |
| `docs/LOCAL_VERIFY.md`      | Human local verification loop                      |
| `docs/VERIFY_LOG.md`        | Verify run history + canary artifacts              |
| `docs/SCOPE_EXCEPTIONS.md`  | Out-of-scope edit ledger                           |
| `docs/PROJECT_SUMMARY.md`   | High-level project overview                        |
| `docs/DECISIONS.md`         | Append-only ADR log                                |
| `docs/CURRENT.md`           | ≤30 lines status/next/risk                         |

---

## Planned v3.3 Continuity Tools (add here when implemented)

Not present unless/ until created. When they exist, add them to the Verification Pipeline section and/or here:

- `tools/context`
- `tools/receipt`
- `tools/check_docs_freshness`
- `tools/check_discovery_coverage`
- `tools/check_markers`
- `tools/config/policy.json`
- `.cache/verify-last.txt` (verify cache line)
