# Scope Exceptions Ledger

This is the canonical record of out-of-scope edits made during ticket execution.

| Ticket | Out-of-scope file(s) | Why | How to avoid next time |
|--------|----------------------|-----|------------------------|
| 0134 | `src/domain/reflection.ts` | New `"timeout"` flag required a reflection template entry to keep the build green. The file was not in the allowed-edits list. | Split into two tickets: one for the flag addition (scoring layer) and one for the reflection template update. Alternatively, widen allowed edits upfront when adding new `FlagKind` values. |
| 0136 | `src/app/DemoSession.tsx` | CSV export needed `csvMeta` prop threading from the session host component. | Include host/integration components in allowed edits when changing child component interfaces. |
| 0145 | `src/domain/index.ts`, `src/infra/__tests__/draftLock.test.ts` (new) | New `DraftLock` type and `DRAFT_LOCK_TTL_MS` constant needed re-exporting from the domain barrel; lock tests required a new test file under infra. | Expand allowed edits to include barrel re-export files and test directories when adding new domain types. |
| 0146 | `src/domain/fingerprint.ts` (new), `src/app/DemoSession.tsx` | New fingerprint module needed a dedicated file; `DemoSession` required edits to compute and thread the fingerprint on completion. | Include host/orchestration components and allow new domain files when the ticket introduces a new domain concept. |
| 0149 | `src/app/DemoSession.tsx` | Reproducibility bundle in `ResultsView` required passing `orderPolicy`, `trialTimeoutMs`, and `breakEveryN` via `csvMeta`, which meant editing the parent component. | Include host/integration components in allowed edits when expanding a child component's props interface. |
