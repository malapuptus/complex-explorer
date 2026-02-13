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
| 7.2 | Open CSV; verify columns | Must include: `session_id`, `pack_id`, `pack_version`, `seed`, `order_index`, `word`, `warmup`, `response`, `t_first_input_ms`, `t_submit_ms`, `backspaces`, `edits`, `compositions`, `timed_out`, `flags` |
| 7.3 | Navigate to **Previous Sessions** | Completed session appears in the list |
| 7.4 | Click **Export CSV** (all sessions) | CSV contains rows from all stored sessions |
| 7.5 | Verify no diagnostic language in exports | No clinical terms, no interpretation text |
| 7.6 | On results screen, verify reproducibility bundle shows fingerprint, pack, seed, order policy | All values match the export JSON; Copy button copies the bundle text |

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

---

## Notes

- **Browser matrix:** This checklist assumes Chromium. Safari and Firefox may differ for IME handling — a follow-up ticket should cover cross-browser testing.
- **Device matrix:** Mobile testing (touch input, on-screen keyboard) is not covered here.
- **Automated coverage:** Unit tests cover scoring logic and flag assignment. This checklist covers integration-level and UX-level behavior that automated tests cannot fully verify.
