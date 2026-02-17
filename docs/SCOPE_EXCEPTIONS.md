# Scope Exceptions Ledger

This is the canonical record of out-of-scope edits made during ticket execution.

| Ticket | Out-of-scope file(s) | Why | How to avoid next time |
|--------|----------------------|-----|------------------------|
| 0134 | `src/domain/reflection.ts` | New `"timeout"` flag required a reflection template entry to keep the build green. The file was not in the allowed-edits list. | Split into two tickets: one for the flag addition (scoring layer) and one for the reflection template update. Alternatively, widen allowed edits upfront when adding new `FlagKind` values. |
| 0136 | `src/app/DemoSession.tsx` | CSV export needed `csvMeta` prop threading from the session host component. | Include host/integration components in allowed edits when changing child component interfaces. |
| 0145 | `src/domain/index.ts`, `src/infra/__tests__/draftLock.test.ts` (new) | New `DraftLock` type and `DRAFT_LOCK_TTL_MS` constant needed re-exporting from the domain barrel; lock tests required a new test file under infra. | Expand allowed edits to include barrel re-export files and test directories when adding new domain types. |
| 0146 | `src/domain/fingerprint.ts` (new), `src/app/DemoSession.tsx` | New fingerprint module needed a dedicated file; `DemoSession` required edits to compute and thread the fingerprint on completion. | Include host/orchestration components and allow new domain files when the ticket introduces a new domain concept. |
| 0149 | `src/app/DemoSession.tsx` | Reproducibility bundle in `ResultsView` required passing `orderPolicy`, `trialTimeoutMs`, and `breakEveryN` via `csvMeta`, which meant editing the parent component. | Include host/integration components in allowed edits when expanding a child component's props interface. |
| 0165 | `src/infra/localStorageSessionStore.ts` | `migrateDraft()` did not include the `startedAt` field added to `DraftSession` in Ticket 0158. Without this fix, the persistence test for draft `startedAt` round-trip would fail — `loadDraft()` silently dropped the field. The ticket allowed edits to this file "only if tests reveal a real bug", and the test did reveal the bug. | Include infra adapter files in allowed edits when adding new fields to domain interfaces they serialize. |

## Known Hygiene Exceptions (Ticket 0161)

The following files exceed the constitution's 350-line/file or 60-line/function limits and are temporarily allowlisted in `tools/check-hygiene.ts`. Each requires a follow-up decomposition ticket.

| File | Current lines | Limit | Follow-up ticket |
|------|--------------|-------|-------------------|
| ~~`src/app/DemoSession.tsx`~~ | ~~447~~ → ~290 | 350 | Ticket 0162 (done — split into DemoSessionHelpers, ResumePrompt, RunningTrial) |
| `src/app/ResultsView.tsx` | ~310 | 350 | Within limit but allowlisted at 400 as buffer; entry removed in Ticket 0163 |
