# Scope Exceptions Ledger

This is the canonical record of out-of-scope edits made during ticket execution.

| Ticket | Out-of-scope file(s) | Why | How to avoid next time |
|--------|----------------------|-----|------------------------|
| 0134 | `src/domain/reflection.ts` | New `"timeout"` flag required a reflection template entry to keep the build green. The file was not in the allowed-edits list. | Split into two tickets: one for the flag addition (scoring layer) and one for the reflection template update. Alternatively, widen allowed edits upfront when adding new `FlagKind` values. |
| 0136 | `src/app/DemoSession.tsx` | CSV export needed `csvMeta` prop threading from the session host component. | Include host/integration components in allowed edits when changing child component interfaces. |
