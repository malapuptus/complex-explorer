/**
 * indicators.ts — unified "Indicator" system that subsumes both auto-scored
 * FlagKind values and deterministic CI codes into a single canonical descriptor
 * map. Ticket 0282.
 *
 * Design decisions:
 *  - IndicatorCode is the union of CiCode and FlagKind.
 *  - Every code gets one canonical human-readable description and a category.
 *  - Mapping helpers convert flagCounts / ciByTrial into indicatorsByTrial and
 *    indicatorCounts so exports have ONE unified field.
 *  - Existing filter chips and CI chips continue to work; they just delegate
 *    to this module for labels / ordering.
 */

import type { FlagKind } from "./types";
import type { CiCode } from "./ciCodes";

// ── Types ─────────────────────────────────────────────────────────────

/**
 * Union of all indicator codes.
 *   - CI codes: F, MSW, RSW, PRT, (P)
 *   - Flag codes: timing_outlier_slow, timing_outlier_fast, empty_response,
 *                 repeated_response, high_editing, timeout
 */
export type IndicatorCode = CiCode | FlagKind;

export type IndicatorCategory = "quality" | "timing" | "content" | "input";

export interface IndicatorDescriptor {
  code: IndicatorCode;
  label: string;
  /** Short explanation shown in tooltips / "Why am I seeing this?" (0284) */
  explanation: string;
  category: IndicatorCategory;
  /** True for auto-scored indicators (flags + CI); false = manual-only. */
  isAuto: boolean;
}

// ── Canonical descriptor map ───────────────────────────────────────────

export const INDICATOR_DESCRIPTORS: Readonly<Record<IndicatorCode, IndicatorDescriptor>> = {
  // ── CI codes (deterministic) ──────────────────────────────────
  F: {
    code: "F",
    label: "Failure to respond",
    explanation: "The participant gave no response or the trial timed out.",
    category: "quality",
    isAuto: true,
  },
  MSW: {
    code: "MSW",
    label: "Multi-word response",
    explanation: "The participant typed more than one word in their response.",
    category: "content",
    isAuto: true,
  },
  RSW: {
    code: "RSW",
    label: "Response = stimulus",
    explanation: "The participant echoed back the stimulus word exactly.",
    category: "content",
    isAuto: true,
  },
  PRT: {
    code: "PRT",
    label: "Prolonged RT",
    explanation: "Reaction time was a statistical outlier on the slow end.",
    category: "timing",
    isAuto: true,
  },
  "(P)": {
    code: "(P)",
    label: "Perseveration",
    explanation: "The same response was given for multiple stimuli.",
    category: "content",
    isAuto: true,
  },

  // ── Scoring flags (auto) ──────────────────────────────────────
  timing_outlier_slow: {
    code: "timing_outlier_slow",
    label: "Slow outlier",
    explanation: "Reaction time was unusually slow compared to the session median (MAD-based).",
    category: "timing",
    isAuto: true,
  },
  timing_outlier_fast: {
    code: "timing_outlier_fast",
    label: "Fast outlier",
    explanation: "Reaction time was unusually fast (under 200 ms).",
    category: "timing",
    isAuto: true,
  },
  empty_response: {
    code: "empty_response",
    label: "Empty response",
    explanation: "No text was entered before submission.",
    category: "quality",
    isAuto: true,
  },
  repeated_response: {
    code: "repeated_response",
    label: "Repeated response",
    explanation: "This exact response appeared in a previous trial.",
    category: "content",
    isAuto: true,
  },
  high_editing: {
    code: "high_editing",
    label: "High editing",
    explanation: "An unusually high number of edits/backspaces occurred during this trial.",
    category: "input",
    isAuto: true,
  },
  timeout: {
    code: "timeout",
    label: "Timeout",
    explanation: "The trial ended because the time limit was reached.",
    category: "quality",
    isAuto: true,
  },
};

/**
 * Display order for indicators (CI codes first, then flags).
 * Used for consistent rendering across chips, charts, exports.
 */
export const INDICATOR_ORDER: IndicatorCode[] = [
  "F", "MSW", "RSW", "PRT", "(P)",
  "timing_outlier_slow", "timing_outlier_fast",
  "empty_response", "repeated_response", "high_editing", "timeout",
];

// ── Mapping helpers ────────────────────────────────────────────────────

/**
 * Merge CI codes and flag codes for a single trial into a unified
 * IndicatorCode[]. De-duplicates overlapping concepts:
 *   - "F" already covers empty_response + timeout
 *   - "PRT" already covers timing_outlier_slow
 *   - "(P)" already covers repeated_response
 *
 * For the indicators array we include BOTH the CI code and the flag,
 * because they carry distinct information for filtering (CI for research
 * notation, flag for internal scoring). Consumers can deduplicate by
 * category if needed.
 */
export function mergeTrialIndicators(
  ciCodes: CiCode[],
  flags: FlagKind[],
): IndicatorCode[] {
  const seen = new Set<IndicatorCode>();
  const result: IndicatorCode[] = [];
  for (const c of ciCodes) {
    if (!seen.has(c)) { seen.add(c); result.push(c); }
  }
  for (const f of flags) {
    if (!seen.has(f)) { seen.add(f); result.push(f); }
  }
  return result;
}

/**
 * Aggregate indicator counts over a per-trial map.
 */
export function aggregateIndicatorCounts(
  indicatorsByTrial: Map<number, IndicatorCode[]>,
): Partial<Record<IndicatorCode, number>> {
  const counts: Partial<Record<IndicatorCode, number>> = {};
  for (const codes of indicatorsByTrial.values()) {
    for (const c of codes) {
      counts[c] = (counts[c] ?? 0) + 1;
    }
  }
  return counts;
}

/** Convenience: label for an indicator code. */
export function indicatorLabel(code: IndicatorCode): string {
  return INDICATOR_DESCRIPTORS[code]?.label ?? code;
}

/** Convenience: explanation for an indicator code. */
export function indicatorExplanation(code: IndicatorCode): string {
  return INDICATOR_DESCRIPTORS[code]?.explanation ?? "";
}
