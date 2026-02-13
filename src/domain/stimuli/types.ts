/**
 * Stimulus list types and validation.
 * Pure domain — no I/O.
 */

/** A versioned, attributable stimulus word list. */
export interface StimulusList {
  /** Unique identifier for this list. */
  readonly id: string;
  /** Semantic version string (e.g. "1.0.0"). */
  readonly version: string;
  /** ISO 639-1 language code (e.g. "en", "de"). */
  readonly language: string;
  /** Attribution / source description. */
  readonly source: string;
  /** The ordered list of stimulus words. */
  readonly words: readonly string[];
}

export interface StimulusListValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Validate a stimulus list. Returns an array of errors (empty = valid).
 */
export function validateStimulusList(
  list: Partial<StimulusList>,
): StimulusListValidationError[] {
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
  if (!Array.isArray(list.words) || list.words.length === 0) {
    errors.push({ field: "words", message: "words must be a non-empty array" });
  } else {
    const blanks = list.words.filter((w) => typeof w !== "string" || w.trim() === "");
    if (blanks.length > 0) {
      errors.push({
        field: "words",
        message: `${blanks.length} blank or non-string word(s) found`,
      });
    }
  }

  return errors;
}
