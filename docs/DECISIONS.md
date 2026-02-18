# Architectural Decision Record (ADR-lite)

> Append-only. Add new entries at the bottom. Never edit past entries.
> Format: ## ADR-NNN — Title | Date | Status

---

## ADR-001 — Three-layer architecture (app → domain → infra) | 2026-02-13 | Accepted

Domain is pure (no I/O). Infra handles storage. App orchestrates. Enforced by check-boundaries.ts.

## ADR-002 — Mulberry32 PRNG + Fisher-Yates shuffle | 2026-02-13 | Accepted

Deterministic, seedable, unit-tested. Seed stored in session result for full reproducibility.

## ADR-003 — MAD-based modified Z-score for slow outliers (threshold 3.5) | 2026-02-13 | Accepted

Robust to extreme values. Requires ≥5 non-empty scored trials; below threshold only fast<200ms applies.

## ADR-004 — SHA-256 pack integrity via SubtleCrypto | 2026-02-14 | Accepted

Hash frozen in integrity.ts EXPECTED_HASHES. Mismatch → UI warning "pack changed; prior sessions not comparable."

## ADR-005 — Staging-key → commit-key atomic saves | 2026-02-15 | Accepted

Prevents partial writes to localStorage. Crash recovery cleans up staging keys on next load.

## ADR-006 — rb_v3 research bundle schema | 2026-02-15 | Accepted

Versioned export schema. Includes appVersion, scoringAlgorithm, privacy manifest, provenance snapshot.

## ADR-007 — pkg_v1 session package with integrity hash | 2026-02-15 | Accepted

Wraps bundle + CSV + csvRedacted. packageHash (SHA-256) covers all fields except itself.

## ADR-008 — Unified Indicators system (IndicatorCode union) | 2026-02-18 | Accepted

Merges CiCode + FlagKind into IndicatorCode. Single source of truth for labels, tooltips, exports.
mergeTrialIndicators + aggregateIndicatorCounts replace ad-hoc dual lookups.

## ADR-009 — Charts-First layout as default for new sessions | 2026-02-18 | Accepted

Overview (charts) is default tab. Details (table + filters) accessible in one click. Mobile stacks cleanly.

## ADR-010 — Manual indicator tags source:"manual" distinct from auto | 2026-02-18 | Accepted

Manual tags (B, DR, M, Med, Fl, So, S) stored with source:"manual" in trial annotations.
Never collide with auto-computed indicators. Appear in exports alongside auto indicators.

## ADR-011 — Verify is the truth layer (8-oracle gate + Lovable proxy) | 2026-02-18 | Accepted

Single source of truth for “PASS/FAIL” is the verify pipeline:

- Preferred: tools/verify (bash entry) → tools/verify.mjs (canonical gate)
- Lovable sandbox: tools/verify-proxy.mjs may SKIP unavailable oracles, but must be explicit about SKIPs

Rationale:

- Prevent fabricated “PASS” claims and enforce whole-system coherence continuously.
- Keep a stable developer loop: failures are concrete and reproducible.

## ADR-012 — Adopt AI Coding OS v3.3 + continuity baton docs | 2026-02-18 | Accepted

Process is treated as load-bearing:

- Canonical OS prompts live in docs/AI_CODING_OS_v3.3.md
- Continuity baton docs exist and are maintained:
  - docs/CURRENT.md (≤30 lines status/next)
  - docs/DECISIONS.md (this file; append-only)
  - docs/CORE_MODULES.md (load-bearing modules)
  - docs/PROJECT_SUMMARY.md (project overview)

Rationale:

- Prevent long-run drift across many small AI-assisted tickets.
- Keep the repo itself as the durable “truth snapshot,” not chat memory.
