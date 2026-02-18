# Project Summary — Complex Mapper

> Last updated: 2026-02-18 | Test count: 621/621

---

## What We're Building

**Complex Mapper** is a client-side word-association research tool. A participant sees a stimulus word
and types the first association that comes to mind. The app measures reaction time, first-key latency,
backspaces, edits, and IME composition events per trial, then scores the session against statistical
outlier thresholds and clinical indicator codes.

Target users: clinicians, researchers, and individuals doing personal cognitive exploration.
**Not a diagnostic tool.** Results are for reflection and exploratory research only.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, TypeScript, Vite, Tailwind CSS |
| Component library | shadcn/ui (Radix UI primitives) |
| State | React hooks + localStorage (no server) |
| Charts | Custom SVG (RtTimeline, RtHistogram, CiBreakdownChart) |
| Testing | Vitest + React Testing Library |
| Verification | 8-oracle pipeline (`tools/verify.mjs`) |

---

## Architecture

Strict three-layer system enforced by `tools/check-boundaries.ts`:

```
src/app/     ← React components, hooks, orchestration
src/domain/  ← Pure logic (no I/O): scoring, insights, indicators, shuffle, exports
src/infra/   ← Storage adapters: localStorage (sessions, packs, annotations, prefs)
```

Complexity budgets: ≤350 lines/file, ≤60 lines/function, no `console.log` in src/.

---

## Stimulus Packs

| Pack | Words | Notes |
|------|-------|-------|
| `demo-10@1.0.0` | 10 | Quick demo / familiarization |
| `kent-rosanoff-1910@1.0.0` | 100 | Original 1910 free-association list (public domain) |
| `practice-100@1.0.0` | 100 | Clinical practice pack; hash frozen |

Pack integrity is verified with SHA-256 (`SubtleCrypto`). Hash mismatch → UI warning.

---

## Scoring & Indicators

- **Slow outlier:** MAD-based modified Z-score > 3.5 (requires ≥5 non-empty scored trials)
- **Fast outlier:** RT < 200 ms (always applied)
- **Other flags:** `empty_response`, `repeated_response`, `high_editing`, `timeout`
- **CI codes:** `F` (flagged), `MSW` (most-slow word), `RSW` (repeated-slow word), `PRT` (prolonged RT), `(P)` (practice)
- **Unified:** `IndicatorCode` merges `FlagKind` + `CiCode` into one system with canonical labels and tooltips

Manual indicator codes (source: "manual"): `B`, `DR`, `M`, `Med`, `Fl`, `So`, `S`

---

## Key Features Implemented

| Feature | Location |
|---------|---------|
| Session runner + break logic | `src/app/DemoSession.tsx`, `src/app/BreakScreen.tsx` |
| Scoring | `src/domain/scoring.ts` |
| Session insights engine | `src/domain/sessionInsights.ts` |
| Charts-First results dashboard | `src/app/ResultsView.tsx`, `src/app/ResultsDashboardPanel.tsx` |
| SVG charts (timeline + histogram + CI breakdown) | `src/app/ResultsCharts.tsx`, `src/app/CiBreakdownChart.tsx` |
| Chart-click drilldown filter | `src/app/ResultsDashboardPanel.tsx` → `ResultsView.tsx` |
| Trial detail dialog | `src/app/TrialDetailPanel.tsx` |
| Observer Mode manual tagging | `src/app/ObserverMode.tsx` |
| Baseline session compare | `src/infra/localStorageUiPrefs.ts`, `src/app/ResultsView.tsx` |
| Quality score + micro-goal | `src/domain/sessionInsights.ts` (`computeQualityIndex`, `getMicroGoal`) |
| Deterministic session simulation (dev) | `src/domain/simulateSession.ts` |
| Research bundle export (rb_v3) | `src/app/ResultsExportActions.tsx` |
| Session package export (pkg_v1 + SHA-256) | `src/app/ResultsExportActions.tsx` |
| CSV export (full + redacted) | `src/domain/csvExport.ts` |
| Import + integrity verification | `src/app/ImportSection.tsx`, `src/app/importPreviewModel.ts` |
| Custom pack manager | `src/app/CustomPackManager.tsx` |
| Previous sessions drawer | `src/app/SessionsDrawer.tsx`, `src/app/PreviousSessions.tsx` |
| Atomic localStorage saves | staging-key → commit-key pattern |
| Storage quota exceeded recovery | `src/app/DemoSession.tsx` quota handler |

---

## Export Formats

| Format | Schema | Contains |
|--------|--------|---------|
| Research Bundle | rb_v3 | Full session result + provenance + privacy manifest |
| Session Package | pkg_v1 | Bundle + CSV + redacted CSV + SHA-256 hash |
| CSV | csv_v1 | Per-trial rows with indicators, CI codes, RT, flags |
| Pack JSON | pack_v1 | Word list + provenance for re-import |

---

## Verification

The 8-oracle gate (`bash tools/verify` / `node tools/verify.mjs`):
1. Repo hygiene (line/function budgets, no console.log)
2. Prettier format check
3. ESLint
4. TypeScript (`tsc --noEmit`)
5. Boundary check (layer violations)
6. Load smoke (domain barrel import)
7. Vite build
8. Vitest unit tests (621 tests across 57 test files)

In the Lovable sandbox only oracle 8 (tests) runs directly. Oracles 1–7 are documented as SKIP.

---

## Continuity Docs

| File | Purpose |
|------|---------|
| `docs/CURRENT.md` | Current status, next batch, risks |
| `docs/DECISIONS.md` | ADR-lite append-only log |
| `docs/CORE_MODULES.md` | Load-bearing module registry |
| `docs/PROJECT_SUMMARY.md` | This file — project overview |
| `docs/AI_CODING_OS_v3.3.md` | OS prompts (Prompt A + Prompt B) |
| `docs/PROTOCOL.md` | Measurement protocol (what is scored, how) |
| `docs/SCHEMAS.md` | Export schema reference |
| `docs/VERIFY_LOG.md` | Verify run history + canary artifacts |
| `docs/SCOPE_EXCEPTIONS.md` | Out-of-scope edit ledger |
| `CONSTITUTION.md` | Project constitution + enforced rules |
