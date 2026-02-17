/**
 * importPreviewModel — pure logic for import preview analysis.
 * Tickets 0250 (extract from ImportPreviewPanel) + 0253 (SSoT for available actions)
 *        + 0260 (compatibility warnings).
 * No I/O, no React. Safe to import in tests without a DOM.
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
  /** Ticket 0260: compatibility metadata extracted from bundle/package. */
  compat?: ImportCompat | null;
}

// ── Compatibility warnings (0260) ────────────────────────────────────

/** Compatibility metadata extracted during import analysis. */
export interface ImportCompat {
  /** rb schema version from the import file (e.g. "rb_v3"). */
  exportSchemaVersion: string | null;
  /** Protocol doc version from the bundle. */
  protocolDocVersion: string | null;
  /** App version recorded in the bundle. */
  importedAppVersion: string | null;
  /** Privacy mode recorded in the bundle. */
  privacyMode: string | null;
}

/** A single compatibility warning. */
export interface CompatWarning {
  field: string;
  message: string;
}

/** Current app schema / protocol constants the model checks against. */
export const CURRENT_EXPORT_SCHEMA = "rb_v3";
export const SUPPORTED_SCHEMAS = ["rb_v2", "rb_v3"];
export const CURRENT_PROTOCOL_DOC = "PROTOCOL.md@2026-02-13";

declare const __APP_VERSION__: string;
function currentAppVersion(): string | null {
  try {
    return typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null;
  } catch {
    return null;
  }
}

/**
 * Derive non-blocking compatibility warnings from compat metadata.
 * Ticket 0260: advisory only — never blocks import.
 */
export function getCompatWarnings(compat: ImportCompat | null | undefined): CompatWarning[] {
  if (!compat) return [];
  const warnings: CompatWarning[] = [];

  if (
    compat.exportSchemaVersion &&
    compat.exportSchemaVersion !== CURRENT_EXPORT_SCHEMA &&
    SUPPORTED_SCHEMAS.includes(compat.exportSchemaVersion)
  ) {
    warnings.push({
      field: "exportSchemaVersion",
      message: `Older schema version: ${compat.exportSchemaVersion} (current: ${CURRENT_EXPORT_SCHEMA})`,
    });
  }

  if (compat.protocolDocVersion && compat.protocolDocVersion !== CURRENT_PROTOCOL_DOC) {
    warnings.push({
      field: "protocolDocVersion",
      message: `Different protocol version: ${compat.protocolDocVersion}`,
    });
  }

  const appVer = currentAppVersion();
  if (appVer && compat.importedAppVersion && compat.importedAppVersion !== appVer) {
    warnings.push({
      field: "appVersion",
      message: `Created with app v${compat.importedAppVersion} (current: v${appVer})`,
    });
  }

  return warnings;
}

/**
 * Structured action descriptor produced by getAvailableActions.
 * Ticket 0253: single source of truth for both the bullet list and button gating.
 */
export type AvailableAction =
  | "Import as Session"
  | "Extract Pack"
  | "Import Pack"
  | "Blocked: Integrity mismatch";

// ── Helpers ──────────────────────────────────────────────────────────

export function formatKB(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Try to extract a pack from a Research Bundle JSON (rb_v3+).
 * Returns null if the JSON is not a bundle or lacks pack payload.
 */
export function extractPackFromBundle(
  parsed: Record<string, unknown>,
): Partial<StimulusList> | null {
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

/** Extract compat metadata from a bundle object (rb_v3). */
function extractCompat(bundleObj: Record<string, unknown>): ImportCompat {
  const privacy = bundleObj.privacy as Record<string, unknown> | undefined;
  return {
    exportSchemaVersion: (bundleObj.exportSchemaVersion as string | null) ?? null,
    protocolDocVersion: (bundleObj.protocolDocVersion as string | null) ?? null,
    importedAppVersion: (bundleObj.appVersion as string | null) ?? null,
    privacyMode: privacy ? (privacy.mode as string | null) ?? null : null,
  };
}

/** Detect type and extract pack data for preview. */
export function analyzeImport(
  parsed: Record<string, unknown>,
  rawJson: string,
): ImportPreview | null {
  let type: ImportType = "pack";
  let packData: Partial<StimulusList> | null = null;
  let packageVersion: string | undefined;
  let packageHash: string | undefined;
  let compat: ImportCompat | null = null;

  // Session package?
  if (typeof parsed.packageVersion === "string" && parsed.bundle) {
    type = "package";
    packageVersion = parsed.packageVersion;
    packageHash = typeof parsed.packageHash === "string" ? parsed.packageHash : undefined;
    const bundle = parsed.bundle as Record<string, unknown>;
    packData = extractPackFromBundle(bundle);
    compat = extractCompat(bundle);
  }
  // Research bundle?
  else if (typeof parsed.exportSchemaVersion === "string") {
    type = "bundle";
    packData = extractPackFromBundle(parsed);
    compat = extractCompat(parsed);
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
    compat,
  };
}

/**
 * Derive the canonical list of available actions from preview state.
 * Ticket 0253: single source of truth — used by both the bullet list and button rendering.
 */
export function getAvailableActions(
  preview: ImportPreview,
  integrityFailed: boolean,
): AvailableAction[] {
  if (integrityFailed) return ["Blocked: Integrity mismatch"];

  if (preview.type === "package") {
    const actions: AvailableAction[] = [];
    if (preview.sessionToImport) actions.push("Import as Session");
    if (preview.wordCount > 0) actions.push("Extract Pack");
    if (actions.length === 0) actions.push("Import as Session");
    return actions;
  }

  // bundle or pack
  return ["Import Pack"];
}
