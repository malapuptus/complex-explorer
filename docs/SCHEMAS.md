# Schema Reference

> Single source of truth for all versioned data formats in Complex Mapper.

---

## sp_v1 — Stimulus Pack Schema

**Current version:** `sp_v1`

### Structure

```json
{
  "id": "string (required, unique)",
  "version": "string (required, semver)",
  "language": "string (required, ISO 639-1)",
  "source": "string (required, short attribution)",
  "provenance": {
    "sourceName": "string (required)",
    "sourceYear": "string (required)",
    "sourceCitation": "string (required)",
    "licenseNote": "string (required)"
  },
  "words": ["string[]", "(required, non-empty, no duplicates, no blanks)"],
  "stimulusSchemaVersion": "sp_v1",
  "stimulusListHash": "string (SHA-256 of words.join('\\n'))"
}
```

### Hash canonicalization

The `stimulusListHash` is computed as:

```
SHA-256( words.join("\n") )
```

- Words are joined with a single newline character (`\n`), no trailing newline.
- The hash is hex-encoded (lowercase).
- This canonicalization must remain stable across versions.

### Validation rules

- `id`, `version`, `language`, `source` must be non-empty strings.
- `provenance` must include all four fields as non-empty strings.
- `words` must be a non-empty array of non-blank strings with no duplicates (case-insensitive).

---

## csv_v1 — CSV Export Schema

**Current version:** `csv_v1`

### Columns (in order)

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | `csv_schema_version` | string | Always `"csv_v1"` |
| 2 | `session_id` | string | Unique session identifier |
| 3 | `session_fingerprint` | string | SHA-256 fingerprint of config + order |
| 4 | `scoring_version` | string | Scoring algorithm version |
| 5 | `pack_id` | string | Stimulus pack ID |
| 6 | `pack_version` | string | Stimulus pack version |
| 7 | `seed` | number\|"" | Seed used for ordering (empty if fixed) |
| 8 | `order_index` | number | 0-based position in stimulus order |
| 9 | `word` | string | Stimulus word |
| 10 | `warmup` | boolean | `true` for practice trials |
| 11 | `response` | string | Participant's response (CSV-escaped) |
| 12 | `t_first_input_ms` | number\|"" | Time to first keypress (empty if none) |
| 13 | `t_submit_ms` | number | Total reaction time in ms |
| 14 | `backspaces` | number | Backspace key count |
| 15 | `edits` | number | Net edit count |
| 16 | `compositions` | number | IME composition count |
| 17 | `timed_out` | boolean | `true` if trial ended via timeout |
| 18 | `flags` | string | Semicolon-separated flag list |

### Notes

- One row per trial (including practice/warmup rows).
- String values containing commas, quotes, or newlines are CSV-escaped.
- The `csv_schema_version` field appears in every data row.

---

## rb_v3 — Research Bundle Schema

**Current version:** `rb_v3`

### Top-level structure

```json
{
  "exportSchemaVersion": "rb_v3",
  "exportedAt": "ISO-8601 timestamp",
  "protocolDocVersion": "PROTOCOL.md@YYYY-MM-DD",
  "appVersion": "string | null",
  "scoringAlgorithm": "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
  "sessionResult": { "..." },
  "stimulusPackSnapshot": {
    "stimulusListHash": "string | null",
    "stimulusSchemaVersion": "string | null",
    "provenance": { "ProvenanceSnapshot | null" },
    "words": ["string[] (full word list when available)"]
  }
}
```

### `sessionResult` fields (required)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Session ID |
| `config` | SessionConfig | Full configuration including pack ID, version, order policy, seed |
| `trials` | Trial[] | All scored trials |
| `scoring` | SessionScoring | `trialFlags` + `summary` (with mean/median RT, counts) |
| `stimulusOrder` | string[] | Exact scored stimulus order |
| `seedUsed` | number\|null | Seed used for shuffle |
| `provenanceSnapshot` | ProvenanceSnapshot\|null | Pack provenance at session time |
| `sessionFingerprint` | string\|null | Deterministic SHA-256 fingerprint |
| `scoringVersion` | string\|null | Scoring algorithm version |
| `startedAt` | string | ISO-8601 session start time |
| `completedAt` | string | ISO-8601 session end time |

### `stimulusPackSnapshot` fields

| Field | Type | Description |
|-------|------|-------------|
| `stimulusListHash` | string\|null | SHA-256 of canonical word list |
| `stimulusSchemaVersion` | string\|null | Pack schema version (e.g. `"sp_v1"`) |
| `provenance` | ProvenanceSnapshot\|null | Full provenance metadata |
| `words` | string[]\|undefined | Full word list (new in rb_v3; absent if unavailable) |

### Changes from rb_v2

- Added `words` array to `stimulusPackSnapshot` — enables pack restoration directly from bundle.
- Bundle is now self-contained: importing a bundle JSON into the pack import flow auto-extracts the pack payload.

### Changes from rb_v1

- Added `stimulusPackSnapshot` as a required top-level key.
- `sessionResult` now includes `startedAt` and `completedAt`.

---

## Version Bump Rules

1. **Patch bump** (e.g. `csv_v1` stays `csv_v1`): Adding optional fields that don't change existing column order or semantics.
2. **Minor bump** (e.g. `rb_v2` → `rb_v3`): Adding required fields, changing field semantics, or restructuring.
3. **Major bump** (e.g. `sp_v1` → `sp_v2`): Breaking changes to existing fields, removing fields, changing hash canonicalization.
4. Always update `docs/SCHEMAS.md` when bumping any schema version.
5. Update `src/domain/__tests__/bundleContract.test.ts` and `src/domain/__tests__/exportParity.test.ts` to assert the new version.
6. Update `docs/QA_CHECKLIST.md` section 7 and 7b to reflect new expected values.
7. Add a VERIFY_LOG canary showing the new schema version in exported artifacts.
8. Migration code in `localStorageSessionStore.ts` must default new fields to `null` for legacy sessions.
9. Never change hash canonicalization rules without a major version bump.
10. Test both fresh sessions and legacy-migrated sessions after any schema change.
