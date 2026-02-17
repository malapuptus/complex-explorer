# Research Mode — HTML Report Generator

Ticket 0262: local-only tool that reads a `pkg_v1` package, verifies integrity, and emits a single self-contained HTML report.

## Prerequisites

Node.js ≥ 18 (no npm install needed — uses only built-in modules).

## Usage

```bash
node tools/research-report.mjs path/to/package.json --out report.html
```

| Argument | Default | Description |
|---|---|---|
| `<pkg.json>` | *(required)* | Path to a `pkg_v1` Session Package |
| `--out <file>` | `research-report.html` | Output HTML file path |

## What it checks

1. **Integrity**: recomputes `packageHash` and exits non-zero (`ERR_INTEGRITY_MISMATCH`) if the file has been modified.
2. Emits the report only if integrity passes.

## Report contents (v1)

| Section | Contents |
|---|---|
| Package header | package hash, export time, privacy summary, appVersion |
| Session summary | trial count, RT stats (mean/median/sd/min/max), flags, device context |
| Provenance | list ID, citation, hash |
| Per-word table | word, RT, edits, backspaces, compositions, timed out, response length, flags |
| Top anomalies | top 10 trials by RT z-score |

## Minimal / Redacted packages

The report adapts automatically:
- **Minimal**: no `words[]` column, responses still shown.
- **Redacted**: responses shown as `[redacted]`.

## Example

```bash
# Export a package from the app, then:
node tools/research-report.mjs exports/cm_pkg_v1_full_abc123_20260217T1200.json --out report.html
open report.html
```

## Adding charts later

Future inline SVG bar charts can be added without dependencies — just extend `tools/research-report.mjs`.
