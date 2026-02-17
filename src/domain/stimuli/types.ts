/**
 * Stimulus list types and validation.
 * Pure domain — no I/O.
 */

/** Provenance metadata for a stimulus list. */
export interface StimulusListProvenance {
  /** Name of the original source (e.g. author, institution). */
  readonly sourceName: string;
  /** Year of publication or creation. */
  readonly sourceYear: string;
  /** Full citation or reference string. */
  readonly sourceCitation: string;
  /** License or usage note (e.g. "public domain", "fair use"). */
  readonly licenseNote: string;
}

export const STIMULUS_SCHEMA_VERSION = "sp_v1";

/** A versioned, attributable stimulus word list. */
export interface StimulusList {
  /** Unique identifier for this list. */
  readonly id: string;
  /** Semantic version string (e.g. "1.0.0"). */
  readonly version: string;
  /** ISO 639-1 language code (e.g. "en", "de"). */
  readonly language: string;
  /** Short attribution / source description (kept for backward compat). */
  readonly source: string;
  /** Structured provenance metadata. */
  readonly provenance: StimulusListProvenance;
  /** The ordered list of stimulus words. */
  readonly words: readonly string[];
  /** Schema version for the pack format (e.g. "sp_v1"). Optional for legacy. */
  readonly stimulusSchemaVersion?: string;
  /** SHA-256 hash of canonical word list (words.join("\\n")). Optional for legacy. */
  readonly stimulusListHash?: string;
}

export interface StimulusListValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Validate a stimulus list. Returns an array of errors (empty = valid).
 */
export function validateStimulusList(list: Partial<StimulusList>): StimulusListValidationError[] {
  const errors: StimulusListValidationError[] = [];

  if (!list.id || list.id.trim() === "") {
    errors.push({ field: "id", message: "id is required" });
  }
  if (!list.version || list.version.trim() === "") {
    errors.push({ field: "version", message: "version is required" });
  }
  if (!list.language || list.language.trim() === "") {
    errors.push({ field: "language", message: "language is required" });
  }
  if (!list.source || list.source.trim() === "") {
    errors.push({ field: "source", message: "source is required" });
  }

  // Provenance validation
  if (!list.provenance) {
    errors.push({ field: "provenance", message: "provenance is required" });
  } else {
    const p = list.provenance;
    if (!p.sourceName || p.sourceName.trim() === "") {
      errors.push({
        field: "provenance.sourceName",
        message: "provenance.sourceName is required",
      });
    }
    if (!p.sourceYear || p.sourceYear.trim() === "") {
      errors.push({
        field: "provenance.sourceYear",
        message: "provenance.sourceYear is required",
      });
    }
    if (!p.sourceCitation || p.sourceCitation.trim() === "") {
      errors.push({
        field: "provenance.sourceCitation",
        message: "provenance.sourceCitation is required",
      });
    }
    if (!p.licenseNote || p.licenseNote.trim() === "") {
      errors.push({
        field: "provenance.licenseNote",
        message: "provenance.licenseNote is required",
      });
    }
  }

  if (!Array.isArray(list.words) || list.words.length === 0) {
    errors.push({
      field: "words",
      message: "words must be a non-empty array",
    });
  } else {
    const blanks = list.words.filter((w) => typeof w !== "string" || w.trim() === "");
    if (blanks.length > 0) {
      errors.push({
        field: "words",
        message: `${blanks.length} blank or non-string word(s) found`,
      });
    }

    // Duplicate word detection
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const w of list.words) {
      if (typeof w === "string") {
        const lower = w.trim().toLowerCase();
        if (seen.has(lower)) duplicates.push(w);
        seen.add(lower);
      }
    }
    if (duplicates.length > 0) {
      errors.push({
        field: "words",
        message: `${duplicates.length} duplicate word(s): ${duplicates.slice(0, 5).join(", ")}`,
      });
    }
  }

  return errors;
}
