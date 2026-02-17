

# Tickets 0244-0248: Import Preview Extraction, Diagnostics, Pack Extract, Session Metadata, Collision Safety, and Gating

## Overview

Five tickets that harden the import flow: extract ImportPreviewPanel from ProtocolScreen (reducing its size by ~150 lines), add integrity diagnostics with copyable details, enable pack extraction from packages, persist import provenance on sessions, prevent ID collisions, and unify button gating with an "Available actions" summary.

---

## Ticket 0244 -- Extract ImportPreviewPanel + integrity diagnostics

**Files changed:**
- **NEW** `src/app/ImportPreviewPanel.tsx` (~120 lines)
- `src/app/ProtocolScreen.tsx` (shrinks by ~150 lines: remove `ImportPreviewPanel`, `ImportPreview` interface, `ImportType`, `analyzeImport`, `extractPackFromBundle`, `formatKB` -- move all to new file)
- `src/app/__tests__/resultsViewExports.test.ts` (add tests for diagnostics rendering)
- `docs/VERIFY_LOG.md`

**What moves to ImportPreviewPanel.tsx:**
- `ImportType` type (line 100)
- `ImportPreview` interface (lines 103-115)
- `analyzeImport()` function (lines 117-148)
- `extractPackFromBundle()` function (lines 75-97)
- `formatKB()` helper (lines 66-69)
- `ImportPreviewPanel` component (lines 150-218)

**New diagnostics in ImportPreviewPanel:**
1. When `integrityResult` is present, show two new `<dl>` rows:
   - "Expected hash" with monospace value from `integrityResult.expected`
   - "Computed hash" with monospace value from `integrityResult.actual`
2. Add a "Copy diagnostics" button that calls `navigator.clipboard.writeText()` with JSON: `{ code: "ERR_INTEGRITY_MISMATCH" | "PASS", expectedHash, computedHash, packageVersion }`.
3. The packageVersion is extracted from `preview` (needs a new optional field `packageVersion?: string` on `ImportPreview`, set during `analyzeImport` for packages).

**ProtocolScreen.tsx changes:**
- Import `ImportPreviewPanel`, `ImportPreview`, `analyzeImport`, `extractPackFromBundle`, `formatKB` from `./ImportPreviewPanel`.
- Remove the moved code (~150 lines removed).
- ProtocolScreen drops from ~533 lines to ~380 lines.

**Tests:**
- Assert that when `integrityResult.valid === false`, both expected and computed hashes render.
- Assert "Copy diagnostics" button exists when integrity result is present.
- Mock `navigator.clipboard.writeText` and assert payload shape.

---

## Ticket 0245 -- "Extract Pack" action from pkg_v1

**Files changed:**
- `src/app/ImportPreviewPanel.tsx` (add "Extract Pack" button)
- `src/app/ProtocolScreen.tsx` (wire `onExtractPack` prop)
- `src/app/__tests__/resultsViewExports.test.ts` (add tests)
- `docs/VERIFY_LOG.md`

**What changes:**
1. `ImportPreviewPanel` gains an `onExtractPack?: () => void` prop.
2. Show "Extract Pack" button when `preview.type === "package"` AND `preview.wordCount > 0` AND integrity is not failed. Hidden otherwise (not disabled -- just not rendered when words are absent).
3. In `ProtocolScreen.tsx`, `onExtractPack` calls existing `doImport(importPreview.packData)` -- reuses the same validation + collision logic.
4. The existing "Import Pack" button label changes contextually: for `type === "package"` it says "Extract Pack"; for `type === "pack" | "bundle"` it stays "Import Pack". This simplifies the action naming.

**Tests:**
- Assert button appears when `preview.type === "package"` and `wordCount > 0`.
- Assert button hidden when `wordCount === 0`.
- Assert clicking triggers the pack import path.

---

## Ticket 0246 -- Persist `importedFrom` on imported sessions

**Files changed:**
- `src/domain/types.ts` (add `importedFrom?` to `SessionResult`)
- `src/infra/localStorageSessionStore.ts` (migration defaults to `null`)
- `src/app/ProtocolScreen.tsx` (set `importedFrom` when importing session from pkg)
- `src/app/PreviousSessions.tsx` (show hash prefix in Imported badge)
- `src/app/__tests__/previousSessions.test.ts` (round-trip + legacy migration)
- `docs/SCHEMAS.md` (addendum: `sessionResult.importedFrom`)
- `docs/VERIFY_LOG.md`

**Type change in `src/domain/types.ts`:**
```typescript
// Add to SessionResult interface (after stimulusPackSnapshot):
readonly importedFrom?: {
  packageVersion: string;
  packageHash: string;
} | null;
```

**Migration in `localStorageSessionStore.ts` `migrateSessionToV3`:**
- Add: `importedFrom: (raw.importedFrom as SessionResult["importedFrom"]) ?? null`

**ProtocolScreen.tsx import-as-session handler:**
- When importing from pkg_v1, set `importedFrom: { packageVersion: parsed.packageVersion, packageHash: parsed.packageHash }` on the session object before saving.

**PreviousSessions.tsx:**
- When session has `importedFrom`, show detail text: `Imported from pkg_v1 (hash: abcdef12...)` below the Imported badge.

**Tests:**
- Persist a session with `importedFrom`, reload, assert fields present.
- Migrate a legacy session (no `importedFrom`), assert it defaults to `null`.

---

## Ticket 0247 -- Import collision safety

**Files changed:**
- `src/app/ProtocolScreen.tsx` (collision detection in import-as-session handler)
- `src/infra/localStorageSessionStore.ts` (add `exists(id)` method)
- `src/domain/sessionStore.ts` (add `exists` to interface)
- `src/app/__tests__/previousSessions.test.ts` or new test file
- `docs/VERIFY_LOG.md`

**SessionStore interface addition (~3 lines):**
```typescript
/** Check if a session with this ID exists. */
exists(id: string): Promise<boolean>;
```

**Implementation in localStorageSessionStore.ts:**
```typescript
async exists(id: string): Promise<boolean> {
  const envelope = readEnvelope();
  return id in envelope.sessions;
},
```

**ProtocolScreen.tsx import handler changes:**
- Before `localStorageSessionStore.save(imported)`, check `await localStorageSessionStore.exists(session.id)`.
- If collision: compute new ID as `${session.id}__import_${packageHash.slice(0,8)}` (using `parsed.packageHash`).
- If that also exists, append `__2`, `__3`, etc. (simple loop, max 10 attempts).
- Show warning in `importSuccess` message: `"Session ID collision -- imported as <newId>"`.

**Tests:**
- Import same pkg twice, assert two distinct sessions exist with different IDs.
- Assert neither overwrites the other's data.

---

## Ticket 0248 -- "Available actions" summary + unified gating

**Files changed:**
- `src/app/ImportPreviewPanel.tsx` (add "Available actions" section + gating logic)
- `src/app/__tests__/resultsViewExports.test.ts` (test 3 fixtures)
- `docs/VERIFY_LOG.md`

**What changes:**
1. Add an "Available actions" row to the preview `<dl>`:
   - Compute action list based on state:
     - Integrity FAIL: `["Blocked: Integrity mismatch"]`
     - Package + words + PASS: `["Import as Session", "Extract Pack"]`
     - Package + no words + PASS: `["Import as Session"]`
     - Bundle with extractable pack: `["Import Pack"]`
     - Pack JSON: `["Import Pack"]`
   - Render as a compact bulleted list within the `<dd>`.

2. Button gating consolidation (already mostly correct, but formalize):
   - Integrity FAIL: all import/extract buttons disabled; "Copy diagnostics" and "Cancel" remain enabled.
   - No words: "Extract Pack" not rendered.
   - No session: "Import as Session" not rendered.

3. Tests with 3 fixtures:
   - valid pkg full (both actions available)
   - valid pkg minimal/redacted (only Import as Session)
   - tampered pkg (Blocked)

---

## Execution Order

1. **0244** -- extract + diagnostics (foundational file split, everything else depends on it)
2. **0245** -- extract pack (adds button to new component)
3. **0246** -- importedFrom metadata (type + migration + UI)
4. **0247** -- collision safety (needs `exists()` + import handler change)
5. **0248** -- gating summary (consolidates all above into clean Available actions)

---

## Technical Notes

- **ProtocolScreen.tsx** is currently 533 lines. After extracting ~150 lines to `ImportPreviewPanel.tsx`, it drops to ~380 lines (well within budget).
- **ImportPreviewPanel.tsx** will be ~120-140 lines initially, growing to ~160 after tickets 0245 and 0248. Within budget.
- `SessionResult.importedFrom` does not require a schema version bump since `migrateSessionToV3` already handles unknown fields via `??` defaulting.
- The `exists()` method is a trivial 3-line addition to `SessionStore`.
- No new dependencies. Clipboard API is standard browser API.
- `_imported` flag (existing) is kept for backward compat; `importedFrom` is the richer metadata.

## Risk Card

- **Proved:** Import flow is debuggable, non-destructive, and traceable. ProtocolScreen shrinks materially.
- **Not proved:** Clipboard API availability in all browsers (fallback: silent fail, diagnostics still visible in UI).
- **Residual:** ImportPreviewPanel line count grows across tickets but stays within budget.
- **Detect failure:** Tests assert hash rendering, collision ID generation, action lists, and disabled states.

