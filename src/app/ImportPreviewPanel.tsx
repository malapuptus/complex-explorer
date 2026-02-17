/**
 * ImportPreviewPanel — render-only component for import previews.
 * Pure logic lives in importPreviewModel.ts (Ticket 0250).
 * Tickets: 0244 (diagnostics), 0245 (Extract Pack), 0248 (Available actions),
 *          0251 (clipboard fallback), 0253 (SSoT gating via getAvailableActions).
 */

import { useState } from "react";
import type { ImportPreview } from "./importPreviewModel";
import { formatKB, getAvailableActions } from "./importPreviewModel";

// Re-export types so existing imports from ImportPreviewPanel still work.
export type { ImportType, ImportPreview } from "./importPreviewModel";
export { analyzeImport, extractPackFromBundle, formatKB } from "./importPreviewModel";

// ── Component ────────────────────────────────────────────────────────

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
  // 0251: clipboard feedback state
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [diagnosticsJson, setDiagnosticsJson] = useState<string | null>(null);

  const typeLabel =
    preview.type === "pack"
      ? "Pack JSON"
      : preview.type === "bundle"
        ? "Research Bundle"
        : "Session Package";

  const integrityFailed = !!(preview.integrityResult && !preview.integrityResult.valid);

  // 0253: derive actions from the single source of truth
  const availableActions = getAvailableActions(preview, integrityFailed);

  // 0245: show "Extract Pack" only for package + words present + integrity OK
  const showExtractPack =
    preview.type === "package" && preview.wordCount > 0 && !integrityFailed;

  const hasSession = !!preview.sessionToImport;

  // 0244 + 0251: Copy diagnostics handler with success/fail feedback
  const handleCopyDiagnostics = () => {
    if (!preview.integrityResult) return;
    const payload = {
      code: preview.integrityResult.valid ? "PASS" : "ERR_INTEGRITY_MISMATCH",
      expectedHash: preview.integrityResult.expected,
      computedHash: preview.integrityResult.actual,
      packageVersion: preview.packageVersion ?? null,
    };
    const json = JSON.stringify(payload, null, 2);
    void navigator.clipboard.writeText(json).then(() => {
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }).catch(() => {
      // 0251: clipboard unavailable — show manual copy fallback
      setCopyStatus("failed");
      setDiagnosticsJson(json);
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

        {/* 0248 / 0253: Available actions row — derived from getAvailableActions() */}
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

        {/* 0244 + 0251: Copy diagnostics button (only when integrity result present) */}
        {preview.integrityResult && (
          <button
            onClick={handleCopyDiagnostics}
            className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            aria-label="Copy integrity diagnostics to clipboard"
          >
            {copyStatus === "copied" ? "Copied ✓" : "Copy diagnostics"}
          </button>
        )}

        <button
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>

      {/* 0251: Manual copy fallback when clipboard API fails */}
      {copyStatus === "failed" && diagnosticsJson && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-destructive">
            Clipboard unavailable — copy the JSON below manually:
          </p>
          <textarea
            readOnly
            value={diagnosticsJson}
            rows={6}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[10px] text-foreground resize-none"
            aria-label="Diagnostics JSON for manual copy"
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </div>
  );
}
