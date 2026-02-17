

# Adjusted Implementation Plan: Tickets 0162--0166

## Changes from previous plan

1. **Path normalization** added to `tools/check-hygiene.ts` (line 35): `const rel = path.relative(SRC, file).replace(/\\/g, "/");` -- included in Ticket 0162 and carried into 0163.
2. **Ticket 0163 simplified**: No refactoring of `ResultsView.tsx`. Only remove its ALLOWLIST entry (it is already 310 lines, well under 350). Also include the path normalization if not already done.
3. **Ticket 0164 break fix**: Use `useEffect` with deps `[scoredCompleted, breakEveryN, isPractice]`. Guard body with `!onBreak && scoredCompleted !== lastBreakAtRef.current`. Do NOT include `lastBreakAtRef.current` or `onBreak` in the dependency array.

---

## Ticket 0162 -- Split DemoSession.tsx

### New files

**`src/app/DemoSessionHelpers.ts`** (~40 lines)
- Exports: `generateId`, `generateTabId`, `estimateDuration`, `buildPackOptions`, `PRACTICE_WORDS`, `DEFAULT_BREAK_EVERY`, `PackOption` interface

**`src/app/ResumePrompt.tsx`** (~45 lines)
- Extracted from DemoSession lines 287-325
- Props: `pendingDraft: DraftSession`, `draftLocked: boolean`, `onResume: () => void`, `onDiscard: () => void`

**`src/app/RunningTrial.tsx`** (~55 lines)
- Extracted from DemoSession lines 363-421
- Contains the break-check render logic and TrialView delegation
- Props: session state, breakEveryN, onBreak, setOnBreak, lastBreakAtRef, BreakScreen/TrialView rendering
- Note: The `setOnBreak(true)` anti-pattern is preserved here as-is (fixed in Ticket 0164)

### Edits to existing files

**`src/app/DemoSession.tsx`**: Import from new files, remove extracted code. Target: ~310 lines.

**`tools/check-hygiene.ts`**:
- Line 35: `const rel = path.relative(SRC, file).replace(/\\/g, "/");`
- Remove `"app/DemoSession.tsx"` from ALLOWLIST

### Estimated line counts after split

| File | Lines |
|------|-------|
| DemoSession.tsx | ~310 |
| DemoSessionHelpers.ts | ~40 |
| ResumePrompt.tsx | ~45 |
| RunningTrial.tsx | ~55 |

---

## Ticket 0163 -- Remove ResultsView allowlist entry (simplified)

### Edits

**`tools/check-hygiene.ts`**: Remove `"app/ResultsView.tsx": { maxLines: 400 }` from ALLOWLIST. The ALLOWLIST object becomes empty `{}`. Ensure path normalization line is present (should already be from 0162).

No changes to `ResultsView.tsx` -- it is 310 lines, under the 350 limit.

---

## Ticket 0164 -- Fix break logic anti-pattern

### Location

`src/app/RunningTrial.tsx` (after Ticket 0162 extracts it there).

### Implementation

Replace the inline `setOnBreak(true)` (current DemoSession lines 390-399) with a `useEffect`:

```text
useEffect(() => {
  if (
    breakEveryN > 0 &&
    !isPractice &&
    scoredCompleted > 0 &&
    scoredCompleted % breakEveryN === 0 &&
    !onBreak &&
    scoredCompleted !== lastBreakAtRef.current
  ) {
    setOnBreak(true);
  }
}, [scoredCompleted, breakEveryN, isPractice]);
```

Key points:
- `onBreak` and `lastBreakAtRef.current` are guards in the body, NOT in the dependency array
- The effect fires when `scoredCompleted` changes (new trial submitted)
- The render body only checks `if (onBreak && ...)` to show BreakScreen

### Files changed

| File | Action |
|------|--------|
| `src/app/RunningTrial.tsx` | Edit (move setState into useEffect) |

---

## Ticket 0165 -- Persistence tests (unchanged from prior plan)

### New file

**`src/infra/__tests__/sessionPersistence.test.ts`** (~80 lines)

Test cases:
1. Save SessionResult with `scoringVersion`, reload, assert present
2. Legacy session without `scoringVersion` migrates to `null`
3. Draft with `startedAt` round-trips correctly
4. Draft without `startedAt` returns `undefined`

---

## Ticket 0166 -- README cleanup (unchanged from prior plan)

Edit `README.md` only: remove `REPLACE_WITH_PROJECT_ID` placeholders, fix oracle count to 8.

---

## Execution order

| Step | Ticket | Notes |
|------|--------|-------|
| 1 | 0162 | Split DemoSession + path normalization + remove DemoSession allowlist |
| 2 | 0163 | Remove ResultsView allowlist entry (one-line change) |
| 3 | 0164 | Fix break anti-pattern in RunningTrial.tsx |
| 4 | 0165 | Add persistence tests |
| 5 | 0166 | README cleanup |

