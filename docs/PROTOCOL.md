# Measurement Protocol

> **Version:** 0.1 · **Last updated:** 2026-02-13
>
> This document describes what Complex Mapper measures, how trials are
> structured, and what is flagged or excluded. It is intended to match
> the current codebase exactly. **This tool is not a diagnostic
> instrument.** Results are for personal reflection and research
> exploration only.

---

## 1. Session Structure

A session consists of two phases presented sequentially:

| Phase | Purpose | Scored? |
|-------|---------|---------|
| **Warm-up** (practice words) | Familiarize participant with the task | No — excluded from all scoring |
| **Scored trials** | Collect timed word associations | Yes |

The number of warm-up and scored words depends on the selected stimulus
pack (see §6).

---

## 2. Trial Flow

For each trial the participant sees a single **stimulus word** and types
the first association that comes to mind.

### Timing definitions

| Metric | Definition |
|--------|------------|
| **Reaction time (RT)** | Time in milliseconds from stimulus display to form submission (Enter key or button press). |
| **Time to first key (tFirstKeyMs)** | Time from stimulus display to the first actual text-producing input event. Captured via `onBeforeInput` (preferred) and `onKeyDown` (fallback). `null` if no input occurred before submit. |
| **Backspace count** | Number of Backspace/Delete key presses during the trial. |
| **Edit count** | Total key events (excluding Enter) during the trial. |
| **Composition count** | Number of IME composition sessions started (via `compositionStart`). |

### Input event handling

The app registers three complementary input listeners:

1. **`onBeforeInput`** — fires on real text insertion even when
   `keydown` does not (mobile virtual keyboards, IME).
2. **`onCompositionStart` / `onCompositionEnd`** — tracks IME
   composition sessions. During active composition, `keydown` timing
   is suppressed (synthetic events) to avoid double-counting.
3. **`onKeyDown`** — traditional fallback; captures Backspace/Delete
   counts and edit count on physical keyboards.

First-input time is recorded by whichever event fires first.

---

## 3. Warm-up Rules

- Practice words are presented before scored words.
- Practice trials carry `isPractice: true` and are **excluded** from
  all scoring calculations (means, medians, flags, summaries).
- Practice words are never included in `stimulusOrder` (the realized
  scored word sequence stored in the session result).

---

## 4. Stimulus Ordering

Two order policies are supported:

| Policy | Behavior |
|--------|----------|
| `fixed` | Words are presented in the order defined by the stimulus pack. |
| `seeded` | Words are shuffled using a deterministic PRNG seeded with an explicit or auto-generated integer seed. |

### Seeded randomization details

- **PRNG:** Mulberry32 (32-bit state, full-period).
- **Shuffle algorithm:** Fisher–Yates (Knuth) in-place shuffle on a
  copy of the word array.
- **Determinism guarantee:** Given the same seed and the same word
  list, the output order is identical across runs and environments
  (unit-tested).
- **Seed storage:** The seed actually used (`seedUsed`) and the
  realized order (`stimulusOrder`) are persisted in the session result
  for reproducibility.

---

## 5. Outlier Detection & Flagging

Scoring is performed by `scoreSession()` after all trials are
collected. Only scored (non-practice) trials are evaluated.

### 5.1 Timing outliers — slow

Uses **MAD-based modified Z-scores** (robust to outliers):

```
Modified Z = 0.6745 × (RT − median_RT) / MAD
```

A trial is flagged `timing_outlier_slow` when:

- Sample size ≥ 5 (scored trials with non-empty responses), **and**
- MAD > 0 (non-degenerate distribution), **and**
- Modified Z > **3.5**

Reference: Iglewicz, B., & Hoaglin, D. C. (1993). *Volume 16: How to
Detect and Handle Outliers.* ASQ Quality Press.

### 5.2 Timing outliers — fast

A trial is flagged `timing_outlier_fast` when:

- RT < **200 ms** (absolute threshold, always applied regardless of
  sample size).

### 5.3 Empty response

Flagged `empty_response` when the trimmed response string is empty.

### 5.4 Repeated response

Flagged `repeated_response` when a case-insensitive match of the
response has already appeared in an earlier scored trial within the
same session.

### 5.5 High editing

Flagged `high_editing` when `backspaceCount > 3`.

### Summary statistics

The session summary includes:

- Total scored trials
- Mean, median, and standard deviation of RT (all scored trials)
- Counts of each flag type

---

## 6. Stimulus Packs

### 6.1 Demo pack (`demo-10@1.0.0`)

- **Words:** 10 common English nouns/concepts.
- **Source:** Internal project demo list — not derived from any
  clinical instrument.
- **Purpose:** Quick testing and familiarization.
- **License:** No restrictions.

### 6.2 Kent–Rosanoff 1910 (`kent-rosanoff-1910@1.0.0`)

- **Words:** 100 common English stimulus words.
- **Source:** Kent, G. H., & Rosanoff, A. J. (1910). "A study of
  association in insanity." *American Journal of Insanity*, 67, 37–96.
- **Purpose:** Standardized free association test designed to elicit
  associations without emotional loading.
- **License:** Public domain (published 1910, US copyright expired).
- **Note:** Word list sourced from secondary digital archives; minor
  ordering variations may exist across published reproductions.

---

## 7. Provenance & Reproducibility

Each saved session result includes a **provenance snapshot** frozen at
the time of the session:

- Stimulus pack ID and version
- Language
- Source name, year, full citation, and license note
- Word count

This ensures that future edits to stimulus packs do not retroactively
alter the metadata associated with completed sessions.

The combination of `seedUsed` + `stimulusOrder` + provenance snapshot
is sufficient to reconstruct the exact presentation sequence.

---

## 8. Known Limitations

| Area | Limitation |
|------|-----------|
| **Hardware variance** | RT precision depends on browser event loop, OS input latency, and keyboard hardware. Results are not comparable across devices without calibration. |
| **IME / mobile input** | Composition-based input (Chinese, Japanese, Korean, etc.) and mobile virtual keyboards may produce less precise `tFirstKeyMs` values. A `compositionCount` metric is recorded for transparency. |
| **Display latency** | Stimulus onset time is measured from the React render call, not from actual pixel display. Frame-level jitter (~16 ms at 60 Hz) is not accounted for. |
| **Network / environment** | The app runs client-side with no server timing. Environmental distractions are not controlled. |
| **Small samples** | MAD-based outlier detection requires ≥ 5 scored trials with non-empty responses. Below this threshold, only the absolute fast threshold (< 200 ms) is applied. |
| **No normative data** | No population norms are provided. Flags indicate statistical patterns within a single session only. |

---

## 9. Disclaimer

This software is **not a diagnostic tool**. It does not diagnose,
treat, or screen for any psychological or neurological condition.
Response patterns and flags are descriptive statistics intended for
personal reflection, education, and exploratory research only.

---

## References

- Iglewicz, B., & Hoaglin, D. C. (1993). *Volume 16: How to Detect
  and Handle Outliers.* ASQ Quality Press.
- Kent, G. H., & Rosanoff, A. J. (1910). A study of association in
  insanity. *American Journal of Insanity*, 67, 37–96.
