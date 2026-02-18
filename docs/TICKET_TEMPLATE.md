Ticket XXXX — <Short title (imperative, specific)>

Goal (1 sentence):
<Exactly one sentence describing the user-visible outcome.>

Scope / Context (optional, 1–3 bullets):

- <What this affects / where it lives>
- <Why now / dependency>

Allowed edits:
May edit:

- <file path>
- <file path>

May add:

- <new file path>

Must NOT:

- <hard prohibitions: deps, schema, migrations, refactors, UI changes, etc.>
- <“No new npm deps” / “No store migrations” / “No schema bump” as applicable>

Acceptance criteria:

- [ ] <User-observable behavior or deterministic output>
- [ ] <Edge case behavior>
- [ ] <No regressions / preserves X behavior>
- [ ] <Tests updated/added as described>

Implementation notes (optional, 3–8 bullets):

- <Key decisions / algorithms / invariants>
- <Any tricky indexing rules>
- <Any compatibility notes>

Evidence (required):
Paste:

- <exact console output snippet OR>
- <exact UI text/selector screenshot note OR>
- <exact lines changed (file:line range) for docs>

Required oracles:

- <test command(s)> (e.g., pnpm test / node tools/verify.mjs / unit test file names)
- <lint/typecheck if relevant>

Risk Card:
Proved:

- <What this ticket de-risks / makes true>

Not proved:

- <What remains uncertain even after completion>

Residual:

- <Remaining known risk / debt left intentionally>

Detect failure:

- <How we’d notice it’s broken: failing test, wrong UI state, mismatch export, etc.>
