# Tickets 0264–0268: Session Insights, Dashboard, Drilldown, Baseline, Fun Loop

## Context

All five tickets are additive. No schema bumps, no new npm dependencies. One new infra file for UI preferences (0267). The domain layer already has `scoreSession`, `seededShuffle/mulberry32`, `SessionResult`, `FlagKind`, and `TrialFlag` — all of which `sessionInsights.ts` and `simulateSession.ts` will consume directly.

Current `ResultsView.tsx` is 252 lines (budget: 350). `PreviousSessions.tsx` is 270 lines. Both will stay under 350.

---

## Ticket 0264 — `src/domain/sessionInsights.ts` (pure, no I/O)

### Goal

Create a pure “insights engine” that deterministically summarizes a `SessionResult` into:

- quality metrics
- speed profile metrics
- input metrics
- anomalies (top fast/slow)
- chart-ready timeline + histogram
- **drilldown-ready TrialRef lookup**

### Key implementation decisions

#### Indexing

- `sessionTrialIndex` = index in `sessionResult.trials[]` (matches `scoring.trialFlags[].trialIndex`)
- `orderIndex` = `trial.stimulus.index` (matches CSV `order_index`)
- `position` = 0-based position within the scored subset (used for x-axis)

#### timedOut detection (priority order)

1. `trial.timedOut === true` (Trial field)
2. Fallback: flags include **either** `"timeout"` **or** `"timed_out"` from `sessionResult.scoring.trialFlags`

> This supports both spellings for backward compatibility.

#### Speed metric population

Compute speed stats over **scored & !timedOut** RTs only.

#### nonEmptyResponseRate

`nonEmptyResponseRate = (scored && !timedOut && responseLen > 0) / scoredCount`.  
Return 0 if `scoredCount === 0`.

#### flaggedOtherCount

Count scored trials with ≥1 flag **excluding** empty+timeout categories:

- Exclude `"empty_response"`
- Exclude `"timeout"` and `"timed_out"`

#### Histogram (deterministic) — over scored & !timedOut RTs

- `n=0` → `{ binEdges: [], counts: [] }`
- `n=1` → `{ binEdges: [rt, rt+1], counts: [1] }`
- else: 10 bins, `binWidth=(max-min)/10` (use `1` if `0`), edges = 11 values, bin index = `Math.min(Math.floor((rt-min)/binWidth), 9)`

#### p90 — nearest-rank ceiling method

```
p90Index = Math.max(0, Math.ceil(0.9 * n) - 1)
p90 = sorted[p90Index]

```

For n=10: `ceil(9)-1=8` → 9th-largest ✓

#### Anomalies

- `topSlowTrials`: top 5 by RT desc, exclude timedOut, exclude practice
- `topFastTrials`: top 5 by RT asc, exclude timedOut, exclude practice

### Types (co-located in the file, re-exported via barrel)

#### TrialRef (drilldown-ready)

```
{
  sessionTrialIndex: number,
  orderIndex: number,
  position: number,
  word: string,
  reactionTimeMs: number,
  flags: FlagKind[],
  timedOut: boolean,
  response: string,
  responseLen: number,
  tFirstKeyMs: number | null,
  backspaces: number,
  edits: number,
  compositions: number
}

```

#### TimelinePoint

```
{
  sessionTrialIndex: number,
  x: number,   // position
  y: number,   // reactionTimeMs
  timedOut: boolean,
  flags: FlagKind[]
}

```

#### SessionInsights (includes trialRefs + lookup)

Includes all quality/speed/input/anomaly/chart fields listed previously **plus**:

- `trialRefs: TrialRef[]` (one per scored trial, in order)
- `trialRefBySessionTrialIndex: Record<number, TrialRef>` (single source of truth for drilldown)

### buildSessionInsights algorithm (high-level)

1. Build `flagMap: Map<sessionTrialIndex, FlagKind[]>` from `sessionResult.scoring.trialFlags`
2. Compute `scoredTrials` (non-practice) preserving original indices
3. For each scored trial:
  - assemble `TrialRef` (including `response` text)
  - determine `timedOut` using priority logic (Trial field then flags `"timeout"|"timed_out"`)
  - add to `trialRefs` and `trialRefBySessionTrialIndex`
  - add to `timeline` (TimelinePoint)
  - collect RT into `rtsNonTimeout[]` if `!timedOut`
4. Compute speed stats from `rtsNonTimeout`
5. Build histogram from `rtsNonTimeout`
6. Build anomalies from `trialRefs` filtered `!timedOut`
7. Count quality metrics (empty, timeout, flagged, flaggedOtherCount, etc.)

Later additions for 0268 (`computeQualityIndex`, `getMicroGoal`) will be appended in the same file.

### Files changed

- **NEW** `src/domain/sessionInsights.ts` (~160 lines)
- **NEW** `src/domain/__tests__/sessionInsights.test.ts` (~120 lines)
- **EDIT** `src/domain/index.ts` (barrel exports)
- **EDIT** `docs/VERIFY_LOG.md` (canary snippet)

### Tests

`src/domain/__tests__/sessionInsights.test.ts`:

- Flag map correctness (`trialIndex` → flags)
- Median uses average of two middle values for even n
- p90 nearest-rank: `[100..1000]` → p90 = 900
- nonEmptyResponseRate excludes timeouts from numerator and respects empty
- IME detection: any `compositionCount > 0` → `imeUsed = true`
- Histogram determinism (same input → same edges + counts)
- Histogram edge cases (n=0, n=1)
- topSlowTrials sorted desc, length ≤ 5, excludes timedOut + practice
- topFastTrials excludes timedOut + practice
- flaggedOtherCount excludes `empty_response` and both timeout spellings
- trialRefBySessionTrialIndex contains correct TrialRef including `response`

### VERIFY_LOG canary (from `pkg_v1_full_small.json`)

Fixture (3 scored trials: tree/420, house/380, water/510; no timeouts, no empties):

- scoredCount = 3
- medianRtMs = 420
- p90RtMs = 510
- meanRtMs = 436.67
- spikinessMs = 90
- emptyResponseCount = 0
- timeoutCount = 0
- flaggedOtherCount = 0

### Barrel exports (`src/domain/index.ts`)

```
export type { SessionInsights, TrialRef, TimelinePoint } from "./sessionInsights";
export { buildSessionInsights } from "./sessionInsights";

```

---

## Ticket 0265 — Results Dashboard v1

### Goal

Add an in-app dashboard (3 cards + 2 SVG charts + anomalies list) that makes results immediately “worth doing.”

### Files changed

- **NEW** `src/app/ResultsDashboardPanel.tsx`
- **NEW** `src/app/ResultsCharts.tsx`
- **EDIT** `src/app/ResultsView.tsx`
- **NEW** `src/app/__tests__/resultsDashboard.test.tsx`
- **EDIT** `docs/VERIFY_LOG.md`

### ResultsDashboardPanel.tsx

Props:

- `insights: SessionInsights`
- `sessionContext?: SessionContext | null`

Cards:

1. **Response Quality**  
Scored, empty, timeouts, flagged, non-empty rate
2. **Speed Profile**  
median, p90, spikiness, min/max
3. **Input / Device**  
IME used, compositions/backspaces/edits, device label (`unknown` if null)

Below cards:

- `<RtTimeline>` and `<RtHistogram>` from `ResultsCharts.tsx`
- “Anomalies” list showing top slow trials for drilldown (uses `TrialRef.sessionTrialIndex` attribute)

### ResultsCharts.tsx

`<RtTimeline>`

- props: `points: TimelinePoint[]`, `onPointClick?: (sessionTrialIndex: number) => void`
- circles include `data-session-trial-index`

`<RtHistogram>`

- props: `histogram`

### Integration into ResultsView.tsx

Compute insights:

```
const insights = useMemo(
  () => sessionResult ? buildSessionInsights(sessionResult) : null,
  [sessionResult]
);

```

Render dashboard **near the top of Results** (recommended for “fun”):

- place directly under the Results header (before export/repro blocks)

### Tests (`resultsDashboard.test.tsx`)

- renders expected median/empty/flagged values
- timeline + histogram exist by testid
- circle count equals `insights.timeline.length`
- sessionContext null → device label “unknown”

---

## Ticket 0266 — Trial Drilldown

### Goal

Click an anomaly row or timeline point → open detail dialog with the actual trial contents.

### Files changed

- **NEW** `src/app/TrialDetailPanel.tsx`
- **EDIT** `src/app/ResultsDashboardPanel.tsx`
- **EDIT** `src/app/ResultsCharts.tsx`
- **NEW** `src/app/__tests__/trialDrilldown.test.tsx`
- **EDIT** `docs/VERIFY_LOG.md`

### TrialDetailPanel.tsx

Use existing `Dialog` (`src/components/ui/dialog.tsx`).

Props:

- `{ trialRef: TrialRef | null; onClose: () => void }`

Shows:

- word + orderIndex + position
- RT, tFirstKeyMs (or “—”), timedOut badge
- backspaces/edits/compositions
- flags with human-readable labels:
  - empty_response → Empty response
  - timeout → Timed out
  - timed_out → Timed out
  - timing_outlier_slow → Unusually slow
  - timing_outlier_fast → Unusually fast
  - repeated_response → Repeated response
  - high_editing → High editing
- response text or “(empty)”

### ResultsDashboardPanel changes

- state: `selectedSessionTrialIndex: number | null`
- use `insights.trialRefBySessionTrialIndex[selected]` for dialog content (NOT `insights.timeline`)
- anomaly row click: set selected to that trial’s sessionTrialIndex
- timeline point click: set selected to clicked sessionTrialIndex
- render `TrialDetailPanel` when selected != null

### Tests (`trialDrilldown.test.tsx`)

- click anomaly row → dialog opens with correct word/RT
- click timeline point → dialog opens
- labels are human readable (not raw enums)
- close dialog → disappears
- null `tFirstKeyMs` renders “—” (no crash)

---

## Ticket 0267 — Baseline + Compare

### Goal

Let you mark a session as baseline and show comparison deltas on other sessions.

### Files changed

- **NEW** `src/infra/localStorageUiPrefs.ts`
- **EDIT** `src/infra/index.ts`
- **EDIT** `src/app/ResultsView.tsx`
- **EDIT** `src/app/PreviousSessions.tsx`
- **NEW** `src/infra/__tests__/uiPrefs.test.ts`
- **NEW** `src/app/__tests__/resultsBaselineCompare.test.tsx`
- **EDIT** `docs/VERIFY_LOG.md`

### localStorageUiPrefs.ts

Key: `complex-mapper-ui-prefs`

```
interface UiPrefs { baselineSessionId: string | null; }

```

Helpers:

- get/set
- getBaselineSessionId/setBaselineSessionId

### ResultsView.tsx changes

- baseline button: “Mark as baseline” / “Baseline ✓”
- load baseline session via effect when baselineId differs
- if not found: show “Baseline not found” + clear baseline

Compare card when baseline exists & differs:

- median delta
- empty delta
- timeout delta
- flagged delta
- spike overlap: count of word matches in topSlowTrials (current vs baseline)

### PreviousSessions.tsx

- show “Baseline” badge on the baseline session entry

### Tests

- prefs roundtrip + defaults + merge behavior
- compare card appears only when appropriate
- baseline not found flow + clear baseline

---

## Ticket 0268 — Fun Loop (quality index + micro-goal + simulation)

### Goal

Make the product feel like a game: “quality score”, “micro-goal”, and dev-only simulated sessions for fast iteration.

### Files changed

- **EDIT** `src/domain/sessionInsights.ts` (add helpers)
- **EDIT** `src/domain/index.ts` (export helpers)
- **EDIT** `src/app/ResultsDashboardPanel.tsx` (render quality card)
- **NEW** `src/domain/simulateSession.ts`
- **EDIT** `src/app/PreviousSessions.tsx` (dev-only simulate button)
- **NEW** `src/domain/__tests__/simulateSession.test.ts`
- **EDIT** `src/domain/__tests__/sessionInsights.test.ts`
- **NEW** `src/app/__tests__/simulatedSessionFlow.test.tsx`
- **EDIT** `docs/VERIFY_LOG.md`

### Additions to sessionInsights.ts

`computeQualityIndex(insights)`

- start 100
- &nbsp;

- emptyResponseCount * 5

- &nbsp;

- timeoutCount * 10

- &nbsp;

- flaggedOtherCount * 2

- clamp [0, 100]
- return `{ score, penalties[] }`

`getMicroGoal(insights)`

- if emptyResponseCount > 2 → “aim for ≤ 2 empty responses”
- else if timeoutCount > 0 → “avoid timeouts”
- else if spikinessMs > 400 → “steadier pace”
- else → “baseline repeat”

Export via barrel:

```
export { computeQualityIndex, getMicroGoal } from "./sessionInsights";

```

### ResultsDashboardPanel UI

Add a “Session Quality” card:

- score /100
- penalties (max 3 lines)
- micro-goal line

### simulateSession.ts

Pure deterministic generator:

- deterministic id: `sim_${seed}`
- fixed word list (10)
- generate trials + RTs
- generate occasional timeouts/empties
- set `trial.timedOut = true` for timeouts
- **ensure timeout flag compatibility**: either shape data so `scoreSession()` emits the timeout flag, or explicitly ensure timeouts are visible to scoring (preferred outcome: `scoreSession()` should produce a `"timed_out"` (or `"timeout"`) flag for timedOut trials)
- include `stimulusPackSnapshot.words` so charts work without pack store
- include minimal provenanceSnapshot `{ sourceName: "simulated", licenseNote: "internal/sim" }`
- include sessionContext dummy values

### Dev-only button in PreviousSessions.tsx

If `import.meta.env.DEV`:

- “Generate simulated session”
- `simulateSession(Date.now())`, save, refresh list

### Tests

`simulateSession.test.ts`

- deterministic for a fixed seed
- correct trial count
- scoring exists and does not throw
- words present
- some non-zero RTs

Extend `sessionInsights.test.ts`

- getMicroGoal table-driven
- computeQualityIndex arithmetic + clamping

`simulatedSessionFlow.test.tsx`

- build insights from simulated session
- dashboard renders quality score + micro-goal

---

## Execution Order

1. 0264 — pure insights layer
2. 0265 — dashboard + charts
3. 0266 — drilldown
4. 0267 — baseline compare
5. 0268 — fun loop + simulation

---

## Line Budget Summary

All projected files remain under 350 lines. `ResultsView.tsx` stays under 350 after baseline compare.

---

## Risk Card

- Proved: deterministic analysis layer + tests lock behavior; no new deps; drilldown uses existing dialog
- Not proved: SVG layout across all sizes (v1 fixed height acceptable)
- Detect failure: tests catch regressions in insight computation, drilldown mapping, and timeout detection compatibility