# Beta Test Guide

## What we're trying to learn

- Where users get confused (instructions, flow, terminology)
- Where the app breaks (errors, missing states, weird results)
- Whether outputs feel useful and trustworthy

## Quick start (Lovable link)

1. Open the Lovable link we shared with you.
2. Try one complete flow end-to-end (see "Smoke test" below).
3. If anything feels off, file an issue (Bug report / Feature request).

## Smoke test (5–10 minutes)

- [ ] Start a new session
- [ ] Run at least 10 prompts/words
- [ ] Confirm the UI never "dead-ends" (you can always keep going or exit cleanly)
- [ ] Try one navigation detour (switch views, return, confirm state is consistent)
- [ ] If export exists: export and re-import once

## What to test (pick any)

- **Clarity:** Do the instructions make sense without explanation?
- **Flow:** Is it obvious what to do next?
- **Feedback:** Are charts/tables understandable?
- **Stability:** Any crashes, blank screens, or weird resets?
- **Performance:** Any lag spikes or long pauses?

## How to submit feedback

Use GitHub Issues:

- **Bug** → use the ["Bug report"](../../issues/new?template=bug_report.yml) issue form
- **Ideas** → use the ["Feature request"](../../issues/new?template=feature_request.yml) form

Include:

- Steps to reproduce (numbered)
- Expected vs actual
- Screenshot/screen recording if possible
- Console errors if you see them (below)

## How to capture console errors (Chrome)

1. Right-click → Inspect
2. Open the **Console** tab
3. Copy any red errors and paste them into the bug report

## If you can export a session

If the app offers export:

- Attach the exported file to the bug report (or describe what it contains if it's sensitive).
