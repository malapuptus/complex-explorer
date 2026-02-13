# Scope Exceptions Ledger

This is the canonical record of out-of-scope edits made during ticket execution.

| Ticket | Out-of-scope file(s) | Why | How to avoid next time |
|--------|----------------------|-----|------------------------|
| 0134 | `src/domain/reflection.ts` | New `"timeout"` flag required a reflection template entry to keep the build green. | Widen allowed edits to include `reflection.ts` when adding new `FlagKind` values. |
| 0136 | `src/app/DemoSession.tsx` | CSV export needed `csvMeta` prop threading from the session host component. | Include host/integration components in allowed edits when changing child component interfaces. |
