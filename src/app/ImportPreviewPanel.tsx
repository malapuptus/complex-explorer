/**
 * ImportPreviewPanel — extracted from ProtocolScreen (0244).
 * Renders import preview metadata, integrity diagnostics, and action buttons.
 * Tickets: 0244 (extract + diagnostics), 0245 (Extract Pack), 0248 (Available actions).
 */

import type { StimulusList } from "@/domain";
import type { SessionResult } from "@/domain";

// ── Types ────────────────────────────────────────────────────────────

/** Detected import type for preview. */
export type ImportType = "pack" | "bundle" | "package";

/** Import preview data shown before confirmation. */
export interface ImportPreview {
  type: ImportType;
  packData: Partial<StimulusList>;
  wordCount: number;
  hash: string | null;
  schemaVersion: string | null;
  sizeBytes: number;
  rawJson: string;
  /** For pkg_v1: integrity check result (includes expected + actual hashes). */
  integrityResult?: { valid: boolean; expected: string; actual: string } | null;
  /** For pkg_v1: the full session result to import. */
  sessionToImport?: SessionResult | null;
  /** For pkg_v1: the package version string (e.g. "pkg_v1"). */
  packageVersion?: string;
  /** For pkg_v1: the package hash (for collision safety). */
  packageHash?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

export function formatKB(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Try to extract a pack from a Research Bundle JSON (rb_v3+).
 * Returns null if the JSON is not a bundle or lacks pack payload.
 */
export function extractPackFromBundle(parsed: Record<string, unknown>): Partial<StimulusList> | null {
  if (typeof parsed.exportSchemaVersion !== "string") return null;
  const snapshot = parsed.stimulusPackSnapshot as Record<string, unknown> | undefined;
  if (!snapshot) return null;
  const words = snapshot.words as string[] | undefined;
  const prov = snapshot.provenance as Record<string, unknown> | undefined;
  if (!Array.isArray(words) || words.length === 0 || !prov) return null;
  return {
    id: prov.listId as string,
    version: prov.listVersion as string,
    language: prov.language as string,
    source: prov.source as string,
    provenance: {
      sourceName: prov.sourceName as string,
      sourceYear: prov.sourceYear as string,
      sourceCitation: prov.sourceCitation as string,
      licenseNote: prov.licenseNote as string,
    },
    words,
    stimulusSchemaVersion: snapshot.stimulusSchemaVersion as string | undefined,
    stimulusListHash: snapshot.stimulusListHash as string | undefined,
  };
}

/** Detect type and extract pack data for preview. */
export function analyzeImport(parsed: Record<string, unknown>, rawJson: string): ImportPreview | null {
  let type: ImportType = "pack";
  let packData: Partial<StimulusList> | null = null;
  let packageVersion: string | undefined;
  let packageHash: string | undefined;

  // Session package?
  if (typeof parsed.packageVersion === "string" && parsed.bundle) {
    type = "package";
    packageVersion = parsed.packageVersion;
    packageHash = typeof parsed.packageHash === "string" ? parsed.packageHash : undefined;
    const bundle = parsed.bundle as Record<string, unknown>;
    packData = extractPackFromBundle(bundle);
  }
  // Research bundle?
  else if (typeof parsed.exportSchemaVersion === "string") {
    type = "bundle";
    packData = extractPackFromBundle(parsed);
  }
  // Direct pack JSON
  else {
    packData = parsed as Partial<StimulusList>;
  }

  if (!packData) {
    // For packages with no extractable pack (minimal/redacted), still allow session import
    if (type === "package") {
      packData = {};
    } else {
      return null;
    }
  }

  return {
    type,
    packData,
    wordCount: Array.isArray(packData.words) ? packData.words.length : 0,
    hash: (packData.stimulusListHash as string) ?? null,
    schemaVersion: (packData.stimulusSchemaVersion as string) ?? null,
    sizeBytes: rawJson.length,
    rawJson,
    packageVersion,
    packageHash,
  };
}

// ── Component ────────────────────────────────────────────────────────

/**
 * Compute the "Available actions" list for the preview summary row.
 * Tickets 0245 + 0248.
 */
function computeAvailableActions(
  preview: ImportPreview,
  integrityFailed: boolean,
): string[] {
  if (integrityFailed) return ["Blocked: Integrity mismatch"];

  if (preview.type === "package") {
    const actions: string[] = [];
    if (preview.sessionToImport) actions.push("Import as Session");
    if (preview.wordCount > 0) actions.push("Extract Pack");
    if (actions.length === 0) actions.push("Import as Session");
    return actions;
  }

  // bundle or pack
  if (preview.wordCount > 0) return ["Import Pack"];
  return ["Import Pack"];
}

export function ImportPreviewPanel({
  preview,
  onConfirm,
  onCancel,
  onImportSession,
  onExtractPack,
}: {
  preview: ImportPreview;
  onConfirm: () => void;
  onCancel: () => void;
  onImportSession?: () => void;
  onExtractPack?: () => void;
}) {
  const typeLabel =
    preview.type === "pack"
      ? "Pack JSON"
      : preview.type === "bundle"
        ? "Research Bundle"
        : "Session Package";

  const integrityFailed = !!(preview.integrityResult && !preview.integrityResult.valid);
  const hasSession = !!preview.sessionToImport;

  // 0245: show "Extract Pack" only for package + words present + integrity OK
  const showExtractPack =
    preview.type === "package" && preview.wordCount > 0 && !integrityFailed;

  // 0248: Available actions list
  const availableActions = computeAvailableActions(preview, integrityFailed);

  // 0244: Copy diagnostics handler
  const handleCopyDiagnostics = () => {
    if (!preview.integrityResult) return;
    const payload = {
      code: preview.integrityResult.valid ? "PASS" : "ERR_INTEGRITY_MISMATCH",
      expectedHash: preview.integrityResult.expected,
      computedHash: preview.integrityResult.actual,
      packageVersion: preview.packageVersion ?? null,
    };
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).catch(() => {
      // Clipboard may be unavailable — diagnostics still visible in UI
    });
  };

  return (
    <div
      className="w-full max-w-md rounded-md border border-border bg-muted/30 p-4 space-y-2"
      role="region"
      aria-label="Import preview"
    >
      <h4 className="text-sm font-semibold text-foreground">Import Preview</h4>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {/* Type */}
        <dt className="text-muted-foreground">Detected type</dt>
        <dd className="text-foreground">{typeLabel}</dd>

        {/* Pack metadata (only when pack data is present) */}
        {preview.packData.id && (
          <>
            <dt className="text-muted-foreground">Pack ID</dt>
            <dd className="font-mono text-foreground">{preview.packData.id as string}</dd>
          </>
        )}
        {preview.packData.version && (
          <>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-mono text-foreground">{preview.packData.version as string}</dd>
          </>
        )}

        <dt className="text-muted-foreground">Word count</dt>
        <dd className="text-foreground">{preview.wordCount}</dd>

        {preview.hash && (
          <>
            <dt className="text-muted-foreground">Hash</dt>
            <dd className="font-mono text-foreground break-all">{preview.hash}</dd>
          </>
        )}

        {preview.schemaVersion && (
          <>
            <dt className="text-muted-foreground">Schema</dt>
            <dd className="font-mono text-foreground">{preview.schemaVersion}</dd>
          </>
        )}

        <dt className="text-muted-foreground">File size</dt>
        <dd className="text-foreground">{formatKB(preview.sizeBytes)}</dd>

        {/* 0244: Integrity row */}
        {preview.integrityResult && (
          <>
            <dt className="text-muted-foreground">Integrity</dt>
            <dd
              className={
                integrityFailed
                  ? "text-destructive font-semibold"
                  : "text-primary font-semibold"
              }
            >
              {integrityFailed ? "FAIL — ERR_INTEGRITY_MISMATCH" : "PASS ✓"}
            </dd>
          </>
        )}

        {/* 0244: Expected + computed hash rows on integrity result */}
        {preview.integrityResult && (
          <>
            <dt className="text-muted-foreground">Expected hash</dt>
            <dd
              className="font-mono text-foreground break-all text-[10px] leading-4"
              title={preview.integrityResult.expected}
            >
              {preview.integrityResult.expected}
            </dd>
            <dt className="text-muted-foreground">Computed hash</dt>
            <dd
              className={`font-mono break-all text-[10px] leading-4 ${integrityFailed ? "text-destructive" : "text-foreground"}`}
              title={preview.integrityResult.actual}
            >
              {preview.integrityResult.actual}
            </dd>
          </>
        )}

        {/* 0248: Available actions row */}
        <dt className="text-muted-foreground">Available actions</dt>
        <dd>
          <ul className="list-disc list-inside space-y-0.5">
            {availableActions.map((action) => (
              <li
                key={action}
                className={
                  action.startsWith("Blocked")
                    ? "text-destructive"
                    : "text-foreground"
                }
              >
                {action}
              </li>
            ))}
          </ul>
        </dd>
      </dl>

      {integrityFailed && (
        <p className="text-xs text-destructive">
          Package hash mismatch. The file may be corrupted or tampered. Import is blocked.
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {/* Import Pack button (pack / bundle types) */}
        {preview.type !== "package" && (
          <button
            onClick={onConfirm}
            disabled={integrityFailed}
            aria-disabled={integrityFailed}
            className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import Pack
          </button>
        )}

        {/* Import as Session button (package type only) */}
        {preview.type === "package" && hasSession && onImportSession && (
          <button
            onClick={onImportSession}
            disabled={integrityFailed}
            aria-disabled={integrityFailed}
            className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import as Session
          </button>
        )}

        {/* 0245: Extract Pack button (package + words + PASS) */}
        {showExtractPack && onExtractPack && (
          <button
            onClick={onExtractPack}
            className="rounded-md border border-primary px-4 py-1.5 text-sm text-primary hover:bg-primary/10"
          >
            Extract Pack
          </button>
        )}

        {/* 0244: Copy diagnostics button (only when integrity result present) */}
        {preview.integrityResult && (
          <button
            onClick={handleCopyDiagnostics}
            className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            aria-label="Copy integrity diagnostics to clipboard"
          >
            Copy diagnostics
          </button>
        )}

        <button
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
