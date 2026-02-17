/**
 * ImportSection — extracted import wiring from ProtocolScreen (Ticket 0249).
 * Manages file import, preview, session import, pack extract/confirm, and messages.
 * All import logic lives here; ProtocolScreen delegates via onPackImported only.
 */

import { useState, useRef } from "react";
import type { SessionResult } from "@/domain";
import { validateStimulusList, STIMULUS_SCHEMA_VERSION, computeWordsSha256 } from "@/domain";
import type { StimulusList } from "@/domain";
import { localStorageStimulusStore, localStorageSessionStore } from "@/infra";
import { verifyPackageIntegrity } from "./ResultsExportActions";
import { ImportPreviewPanel, analyzeImport } from "./ImportPreviewPanel";
import type { ImportPreview } from "./ImportPreviewPanel";

/** Human-readable messages for validation error codes. */
const ERROR_CODE_MESSAGES: Partial<Record<string, string>> = {
  MISSING_ID: "Pack ID is required.",
  MISSING_VERSION: "Version is required.",
  MISSING_LANGUAGE: "Language is required.",
  MISSING_SOURCE: "Source is required.",
  MISSING_PROVENANCE: "Provenance metadata is required.",
  MISSING_PROVENANCE_SOURCE_NAME: "Provenance source name is required.",
  MISSING_PROVENANCE_SOURCE_YEAR: "Provenance source year is required.",
  MISSING_PROVENANCE_SOURCE_CITATION: "Provenance citation is required.",
  MISSING_PROVENANCE_LICENSE_NOTE: "Provenance license note is required.",
  EMPTY_WORD_LIST: "Word list must not be empty.",
  BLANK_WORDS: "Word list contains blank entries.",
  DUPLICATE_WORDS: "Word list contains duplicates (case-insensitive).",
};

interface ImportSectionProps {
  onPackImported?: () => void;
  selectedPack?: StimulusList | null;
}

export function ImportSection({ onPackImported, selectedPack }: ImportSectionProps) {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doImport = (packData: Partial<StimulusList>) => {
    const errors = validateStimulusList(packData as Partial<StimulusList>);
    if (errors.length > 0) {
      const messages = errors.map((err) => ERROR_CODE_MESSAGES[err.code] ?? err.message);
      setImportError(messages.join("; "));
      return;
    }
    const pack = packData as StimulusList;
    if (localStorageStimulusStore.exists(pack.id, pack.version)) {
      setImportError(
        `Pack "${pack.id}@${pack.version}" already exists. Delete it first to re-import.`,
      );
      return;
    }
    void computeWordsSha256(pack.words as string[]).then((hash) => {
      const enriched: StimulusList = {
        ...pack,
        stimulusSchemaVersion: pack.stimulusSchemaVersion ?? STIMULUS_SCHEMA_VERSION,
        stimulusListHash: pack.stimulusListHash ?? hash,
      };
      if (pack.stimulusListHash && pack.stimulusListHash !== hash) {
        setImportError(
          `Hash mismatch: expected ${pack.stimulusListHash}, computed ${hash}. Pack may be corrupted.`,
        );
        return;
      }
      localStorageStimulusStore.save(enriched);
      const fromType =
        importPreview?.type === "bundle"
          ? " (extracted from Research Bundle)"
          : importPreview?.type === "package"
            ? " (extracted from Session Package)"
            : "";
      setImportSuccess(`Imported "${pack.id}" (${pack.words.length} words)${fromType}`);
      setImportPreview(null);
      onPackImported?.();
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rawJson = reader.result as string;
        const parsed = JSON.parse(rawJson) as Record<string, unknown>;
        const preview = analyzeImport(parsed, rawJson);
        if (!preview) {
          setImportError("Could not detect a valid pack in this file.");
          return;
        }
        // Integrity check for pkg_v1
        if (preview.type === "package" && typeof parsed.packageHash === "string") {
          void verifyPackageIntegrity(parsed).then((result) => {
            let sessionToImport: SessionResult | null = null;
            if (result.valid) {
              const bundle = parsed.bundle as Record<string, unknown> | undefined;
              if (bundle?.sessionResult) {
                const sr = bundle.sessionResult as Record<string, unknown>;
                sessionToImport = sr as unknown as SessionResult;
              }
            }
            setImportPreview({ ...preview, integrityResult: result, sessionToImport });
          });
        } else {
          setImportPreview(preview);
        }
      } catch {
        setImportError("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportPack = () => {
    if (!selectedPack) return;
    void computeWordsSha256(selectedPack.words).then((hash) => {
      const exported = {
        ...selectedPack,
        stimulusSchemaVersion: selectedPack.stimulusSchemaVersion ?? STIMULUS_SCHEMA_VERSION,
        stimulusListHash: selectedPack.stimulusListHash ?? hash,
      };
      const json = JSON.stringify(exported, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pack-${selectedPack.id}-${selectedPack.version}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <>
      {/* Pack tools: import + export */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          Import Pack (JSON / Bundle)
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
        {selectedPack && (
          <button
            onClick={handleExportPack}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            Export Pack JSON
          </button>
        )}
      </div>

      {/* Import preview */}
      {importPreview && (
        <ImportPreviewPanel
          preview={importPreview}
          onConfirm={() => doImport(importPreview.packData)}
          onCancel={() => setImportPreview(null)}
          onExtractPack={
            importPreview.packData && Object.keys(importPreview.packData).length > 0
              ? () => doImport(importPreview.packData)
              : undefined
          }
          onImportSession={async () => {
            if (!importPreview.sessionToImport) return;
            const session = importPreview.sessionToImport;
            const packageHash = importPreview.packageHash ?? "";
            const packageVersion = importPreview.packageVersion ?? "pkg_v1";

            // 0246 + 0252: attach importedFrom provenance incl. originalSessionId
            const withProvenance = {
              ...session,
              _imported: true,
              importedFrom: {
                packageVersion,
                packageHash,
                originalSessionId: session.id,
              },
            } as SessionResult & { _imported: boolean };

            // 0247: collision safety — rewrite ID if already exists
            let finalId = withProvenance.id;
            let collisionWarning = "";
            if (await localStorageSessionStore.exists(finalId)) {
              const baseId = finalId;
              finalId = `${baseId}__import_${packageHash.slice(0, 8)}`;
              let attempt = 2;
              while (
                (await localStorageSessionStore.exists(finalId)) &&
                attempt <= 10
              ) {
                finalId = `${baseId}__import_${packageHash.slice(0, 8)}__${attempt}`;
                attempt++;
              }
              collisionWarning = ` (ID collision — imported as ${finalId})`;
            }

            const toSave = { ...withProvenance, id: finalId };
            void localStorageSessionStore
              .save(toSave)
              .then(() => {
                setImportSuccess(
                  `Session "${finalId}" imported to Previous Sessions.${collisionWarning}`,
                );
                setImportPreview(null);
              })
              .catch((err) => {
                setImportError(`Failed to import session: ${String(err)}`);
              });
          }}
        />
      )}

      {importError && <p className="text-xs text-destructive">{importError}</p>}
      {importSuccess && <p className="text-xs text-primary">{importSuccess}</p>}
    </>
  );
}
