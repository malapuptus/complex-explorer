# SCHEMAS.md — Complex Mapper Data Format Reference

Last updated: 2026-02-17 (Tickets 0238–0248)

---

## SessionResult (v3)

The in-storage session object. Persisted in `complex-mapper-sessions` via `localStorageSessionStore`.

```typescript
interface SessionResult {
  id: string;                          // unique session ID
  config: SessionConfig;               // stimulus list + order policy
  trials: Trial[];                     // all trials including practice
  startedAt: string;                   // ISO-8601 timestamp
  completedAt: string;                 // ISO-8601 timestamp
  scoring: SessionScoring;             // flags + summary
  seedUsed: number | null;             // null if fixed order
  stimulusOrder: string[];             // scored word order (no practice)
  provenanceSnapshot: ProvenanceSnapshot | null;
  sessionFingerprint: string | null;   // SHA-256 of config + order
  scoringVersion: string | null;       // e.g. "scoring_v2_mad_3.5"
  appVersion: string | null;           // app version at session time
  stimulusPackSnapshot: StimulusPackSnapshot | null;
  // 0246: import provenance (null for local sessions, null for legacy)
  importedFrom?: {
    packageVersion: string;            // e.g. "pkg_v1"
    packageHash: string;               // full SHA-256 of the source package
  } | null;
}
```

**Migration:** `migrateSessionToV3` defaults `importedFrom` to `null` for legacy sessions.

---

## rb_v3 — Research Bundle

Top-level keys:

```json
{
  "exportSchemaVersion": "rb_v3",
  "exportedAt": "<ISO-8601>",
  "protocolDocVersion": "PROTOCOL.md@2026-02-13",
  "appVersion": "<string>",
  "scoringAlgorithm": "MAD-modified-z@3.5",
  "privacy": {
    "mode": "full" | "minimal" | "redacted",
    "includesStimulusWords": true | false,
    "includesResponses": true | false
  },
  "sessionResult": { /* SessionResult — see above */ },
  "stimulusPackSnapshot": {
    "stimulusListHash": "<sha256>",
    "stimulusSchemaVersion": "sp_v1",
    "provenance": { /* ProvenanceSnapshot */ },
    "words": ["<word>", ...]  // only in Full mode
  }
}
```

### Privacy modes

| Mode     | `includesStimulusWords` | `includesResponses` | `words[]` | `response` |
|----------|------------------------|--------------------|-----------| -----------|
| Full     | true                   | true               | included  | included   |
| Minimal  | false                  | true               | omitted   | included   |
| Redacted | false                  | false              | omitted   | blanked    |

### Anonymize identifiers

When "Anonymize identifiers" is enabled:
- `sessionResult.id` → `anon_${sessionFingerprint.slice(0, 12)}` (collision-safe, non-identifying)
- `sessionResult.startedAt` → `""` (blank string, key still present)
- `sessionResult.completedAt` → `""` (blank string, key still present)
- `exportedAt` → `""` (blank string, key still present)
- `sessionFingerprint`, `scoring`, all hash fields → **preserved**

---

## pkg_v1 — Session Package

A self-contained, integrity-checked archive of one session.

```json
{
  "packageVersion": "pkg_v1",
  "packageHash": "<sha256-of-package-minus-packageHash>",
  "hashAlgorithm": "sha-256",
  "exportedAt": "<ISO-8601>",
  "bundle": { /* rb_v3 object */ },
  "csv": "<csv_v1 string>",
  "csvRedacted": "<csv_v1 string with responses blanked>"
}
```

### Integrity algorithm

The `packageHash` is SHA-256 of the stable-stringified package with `packageHash` temporarily set to `undefined`:

```
packageHash = sha256( stableStringify(pkg_without_packageHash, KEY_ORDER) )
KEY_ORDER = ["packageVersion","packageHash","hashAlgorithm","exportedAt","bundle","csv","csvRedacted"]
```

### Error codes

| Code | Meaning |
|------|---------|
| `PASS` | `packageHash` matches freshly computed hash |
| `ERR_INTEGRITY_MISMATCH` | Hashes differ — file may be corrupted or tampered |

### Import behavior

- Integrity FAIL → all import/extract actions blocked
- `stimulusPackSnapshot.words` present → "Extract Pack" available
- `bundle.sessionResult` present → "Import as Session" available
- Importing the same package twice produces two sessions with distinct IDs (collision safety: `${id}__import_${hash.slice(0,8)}`)
- Imported sessions gain `importedFrom: { packageVersion, packageHash }`

---

## csv_v1 — Trial CSV

Columns (in order): `csv_schema_version`, `session_id`, `pack_id`, `pack_version`, `order_policy`, `seed_used`, `session_fingerprint`, `scoring_version`, `trial_timeout_ms`, `break_every_n`, `stimulus_list_hash`, `trial_index`, `word`, `response`, `reaction_time_ms`, `t_first_key_ms`, `backspace_count`, `edit_count`, `composition_count`, `timed_out`, flags…
