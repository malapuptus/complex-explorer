# Manual QA Checklist

> **Purpose:** Repeatable, step-by-step verification of scientific timing semantics, UX flows, and data integrity.
>
> Run this checklist before any release or after major changes. Each test states **what to do** and **what to observe**.

---

## Prerequisites

- Use a modern Chromium-based browser (Chrome / Edge).
- Clear localStorage before starting: DevTools → Application → Local Storage → Clear All.
- Keep DevTools Console open to watch for errors.

---

## 1. Demo Session — Fixed Order (10 words)

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1.1 | Open the app, click **Start Demo** | Protocol screen appears with pack info |
| 1.2 | Click **Begin** | First trial appears with a stimulus word |
| 1.3 | Complete all 10 trials (type a response, press Enter or click Submit) | Trials advance in sequence; progress indicator updates |
| 1.4 | After final trial, results screen appears | Summary shows 10 trials; warm-up trials (if any) are excluded from aggregate stats |
| 1.5 | Verify trial order matches the fixed seed | Re-run with same config → identical word order |

## 2. Demo Session — Randomized Order

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 2.1 | Start a demo session with randomization enabled | Trials appear in a shuffled order |
| 2.2 | Complete all trials | Results show all trials; order indices reflect the shuffled sequence |
| 2.3 | Start another session with a different seed | Word order differs from previous session |

## 3. 100-Word Pack — Breaks

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 3.1 | Configure or select a 100-word pack with breaks every N trials | Session starts normally |
| 3.2 | Complete N trials | Break screen appears with a "Continue" button |
| 3.3 | Click **Continue** | Next trial begins; break does not count as a trial |
| 3.4 | Complete all 100 trials through multiple breaks | Results show exactly 100 scored trials (breaks excluded) |

## 3b. Break Canary — breakEveryN=2

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 3b.1 | Start demo-10 with breakEveryN=2 (via advanced settings) | Session starts normally |
| 3b.2 | Complete 2 scored trials | Break screen appears **once** — no duplicate trigger |
| 3b.3 | Click Continue, complete 2 more trials | Second break appears at trial 4 |
| 3b.4 | Complete session | All breaks triggered exactly once per threshold |

## 4. Warm-Up Exclusion

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 4.1 | Start a session that includes warm-up (practice) trials | Warm-up trials are visually indicated (e.g., label or styling) |
| 4.2 | Complete warm-up trials and continue to scored trials | Transition is clear in the UI |
| 4.3 | Complete session and view results | Warm-up trials are **excluded** from: mean RT, flag counts, CSV scored rows |
| 4.4 | Export CSV | Warm-up rows have `warmup` column = `true`; aggregate stats exclude them |

## 5. Timeout Behavior

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 5.1 | Start a session with `trialTimeoutMs` configured (e.g., 5000ms) | Trials display normally |
| 5.2 | On one trial, do **not** type anything; wait for timeout | Trial auto-advances after the timeout period |
| 5.3 | View results | Timed-out trial shows: `response` = `""`, `timed_out` = `true`, flag = `"timeout"` |
| 5.4 | Verify timed-out trial is **not** flagged as `"empty_response"` | Flag is specifically `"timeout"`, not `"empty_response"` |
| 5.5 | Verify timed-out trial RT is excluded from outlier calculations | Aggregate RT stats (mean, MAD) do not include the timeout trial |

## 6. Autosave + Resume

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 6.1 | Start a session and complete 3–5 trials | Trials are recorded normally |
| 6.2 | Refresh the browser (F5 / Cmd+R) | App reloads; a "Resume Session?" prompt appears |
| 6.3 | Click **Resume** | Session continues from the next unfinished trial (not from the beginning) |
| 6.4 | Verify seed and word order are unchanged | Remaining words appear in the same order as before the refresh |
| 6.5 | Complete the session | Results include all trials (pre- and post-refresh); no duplicates |
| 6.6 | Start a new session, complete 2 trials, refresh | Resume prompt appears again |
| 6.7 | Click **Discard** | Draft is deleted; app returns to start screen; no stale data |

## 7. Export — JSON and CSV

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 7.1 | Complete a session and click **Export CSV** on results | CSV file downloads with correct filename |
| 7.2 | Open CSV; verify columns | Must include: `csv_schema_version`, `session_id`, `session_fingerprint`, `scoring_version`, `pack_id`, `pack_version`, `seed`, `order_index`, `word`, `warmup`, `response`, `t_first_input_ms`, `t_submit_ms`, `backspaces`, `edits`, `compositions`, `timed_out`, `flags` |
| 7.3 | Navigate to **Previous Sessions** | Completed session appears in the list |
| 7.4 | Click **Export CSV** (all sessions) | CSV contains rows from all stored sessions |
| 7.5 | Verify no diagnostic language in exports | No clinical terms, no interpretation text |
| 7.6 | On results screen, verify reproducibility bundle shows fingerprint, pack, seed, order policy | All values match the export JSON; Copy button copies the bundle text |
| 7.7 | Click **Export Research Bundle** on results screen | JSON file downloads; contains `sessionResult`, `protocolDocVersion`, `appVersion`, `scoringAlgorithm`, `exportSchemaVersion`, `exportedAt`; fingerprint and repro fields match the UI |

## 7b. Verify-log canary requirements

After each ticket batch, paste into `docs/VERIFY_LOG.md`:

| Canary | What to paste |
|--------|---------------|
| CSV header + row | Full CSV header line + one data row showing `csv_schema_version`, `scoring_version`, `session_fingerprint` populated |
| Research Bundle snippet | JSON snippet showing `sessionResult`, `protocolDocVersion`, `appVersion`, `scoringAlgorithm`, `exportSchemaVersion`, `exportedAt` |
| Break canary | breakLogic.test.ts output or manual observation with breakEveryN=2 |

## 8. Delete My Data

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 8.1 | Complete at least one session; also have a draft in progress (start but don't finish another) | Both completed and draft data exist in localStorage |
| 8.2 | Trigger "Delete my data" action | Confirmation prompt appears |
| 8.3 | Confirm deletion | All completed sessions **and** draft session are removed from localStorage |
| 8.4 | Verify Previous Sessions is empty | No sessions listed |
| 8.5 | Refresh the page | No resume prompt; no stale data |

## 9. IME / Composition Input

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 9.1 | Switch keyboard to a CJK input method (e.g., Chinese Pinyin, Japanese Hiragana) | IME is active in the OS |
| 9.2 | Start a session; on a trial, type using IME composition | Composition underline appears in the input field |
| 9.3 | Commit the composed text and submit | Trial records normally |
| 9.4 | View results or export CSV for that trial | `compositions` count ≥ 1; `t_first_input_ms` reflects the first keydown (not composition commit) |

## 10. Custom Pack Import

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 10.1 | On the protocol screen, click **Import Pack (JSON)** | File picker opens |
| 10.2 | Select a valid JSON file containing a StimulusList | Success message appears with pack name and word count |
| 10.3 | Verify the imported pack appears in the pack selector dropdown | Pack shows with `(custom)` tag |
| 10.4 | Select the custom pack and start a session | Session uses the imported words |
| 10.5 | Import a JSON file with missing required fields (e.g., no `id`) | Error message shows validation failures |
| 10.6 | Import a JSON file with duplicate words | Error message mentions duplicate count |
| 10.7 | Import a non-JSON file | Error message: "Invalid JSON file" |

## 11. Pack Export

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 11.1 | On the protocol screen, click **Export Pack JSON** | JSON file downloads for the currently selected pack |
| 11.2 | Open the JSON; verify it contains `id`, `version`, `language`, `source`, `provenance`, `words` | All provenance fields present |
| 11.3 | Re-import the exported JSON | Import succeeds; pack appears in selector |

---

## Scenario L1: 100-Word Long Session (Kent–Rosanoff)

> **Purpose:** End-to-end verification of breaks, timeout, autosave/resume, and export integrity in a single realistic run.

### Settings

| Setting | Value |
|---------|-------|
| Pack | Kent–Rosanoff 1910 (100 words) |
| Order | Seeded (accept default seed) |
| Timeout | 5 000 ms |
| Break every | 20 trials |

### Script

| Step | Action | Expected Outcome |
|------|--------|------------------|
| L1.1 | Select Kent–Rosanoff pack, configure settings per table above, click **Begin** | Protocol screen shows pack info; session starts |
| L1.2 | Complete trials 1–5 normally (type a word, press Enter) | Trials advance; progress updates |
| L1.3 | On trial 6, **do not type anything**; wait for the 5 s timeout | Trial auto-advances; input clears for next trial |
| L1.4 | On trial 7, type a response, press Backspace 3 times, retype, then submit | Trial records normally |
| L1.5 | Complete trials 8–19 normally | Progress reaches 19/100 |
| L1.6 | After trial 20, break screen appears | "Take a Break" screen with **Continue** button |
| L1.7 | Click **Continue** | Trial 21 appears; break did not count as a trial |
| L1.8 | Complete trials 21–30 normally | Progress reaches 30/100 |
| L1.9 | **Refresh the browser** (F5 / Cmd+R) | App reloads; "Resume Session?" prompt appears |
| L1.10 | Click **Resume** | Session continues from trial 31 (not from the beginning) |
| L1.11 | Verify word order is unchanged from before refresh | Remaining words appear in the same seeded order |
| L1.12 | Complete trials 31–100 (fast-forward: type any single letter + Enter) | Remaining breaks appear at trials 40, 60, 80; session completes after trial 100 |
| L1.13 | Results screen appears | **Session Results** heading visible |

### Expected Outcomes — Results View

| Check | Expected |
|-------|----------|
| Trial count | 100 scored trials (practice excluded) |
| Timeout flag | Exactly 1 trial flagged `timeout` (trial 6) |
| Backspace count | Trial 7 shows `BS ≥ 3` |
| Reproducibility Bundle | Fingerprint (64-char hex), seed (numeric), pack `kent-rosanoff-1910@1.0.0`, order `seeded`, scoring version visible |
| Session Summary Card | Shows pack, seed, order, trial/flagged/timeout counts, median RT, scoring version, export schema, app version |
| Mean/Median RT | Values displayed; timeout trial excluded from aggregates |

### Expected Outcomes — CSV Export

| Check | Expected |
|-------|----------|
| Click **Export CSV** | File downloads with name containing session ID |
| Row count | 103 data rows (3 practice + 100 scored) |
| Timeout trial row | `timed_out` = `true`, `response` = `""`, `flags` contains `timeout` |
| Backspace trial row | `backspaces` ≥ 3 |
| Headers include | `csv_schema_version`, `session_id`, `session_fingerprint`, `scoring_version`, `pack_id`, `seed`, `timed_out`, `flags` |
| Fingerprint column | Same value on every row; matches Reproducibility Bundle display |

### Expected Outcomes — Research Bundle

| Check | Expected |
|-------|----------|
| Click **Export Research Bundle** | JSON file downloads; filename contains date, pack id, seed, fingerprint prefix |
| `sessionResult.trials` | 100 entries (scored only) |
| `scoringAlgorithm` | `MAD-modified-z@3.5 + fast<200ms + timeout excluded` |
| `exportSchemaVersion` | `rb_v1` |
| `appVersion` | Non-null string |
| `sessionResult.sessionFingerprint` | Matches CSV and UI |

---

## Notes

- **Browser matrix:** This checklist assumes Chromium. Safari and Firefox may differ for IME handling — a follow-up ticket should cover cross-browser testing.
- **Device matrix:** Mobile testing (touch input, on-screen keyboard) is not covered here.
- **Automated coverage:** Unit tests cover scoring logic and flag assignment. This checklist covers integration-level and UX-level behavior that automated tests cannot fully verify.
