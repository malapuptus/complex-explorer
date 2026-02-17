/**
 * ciCodes — deterministic CI (coding) code computation for free-association trials.
 * Pure function, no I/O. Ticket 0277.
 *
 * Code definitions:
 *   F    — failure to respond (empty response OR timeout)
 *   MSW  — multi-word response (response contains internal whitespace)
 *   RSW  — response equals stimulus word (same word echoed back)
 *   PRT  — prolonged reaction time (timing_outlier_slow flag)
 *   (P)  — perseveration / repeated response (repeated_response flag)
 */

import type { FlagKind, Trial } from "./types";
import { getResponseText, getTimedOut } from "./trialFields";


export type CiCode = "F" | "MSW" | "RSW" | "PRT" | "(P)";

/**
 * All known CI codes for iteration / display.
 * Order is used for consistent rendering.
 */
export const CI_CODE_ORDER: CiCode[] = ["F", "MSW", "RSW", "PRT", "(P)"];

/** Human-readable label for each CI code. */
export const CI_CODE_LABELS: Record<CiCode, string> = {
  F:    "Failure to respond",
  MSW:  "Multi-word response",
  RSW:  "Response = stimulus",
  PRT:  "Prolonged RT",
  "(P)":"Perseveration",
};

/**
 * Compute CI codes for a single trial.
 *
 * @param trial        — Trial object
 * @param flags        — FlagKind[] from scoring for this trial
 * @param stimulusWord — the word shown to the participant (lowercased for compare)
 */
export function computeCiCodesForTrial(
  trial: Trial,
  flags: FlagKind[],
  stimulusWord: string,
): CiCode[] {
  const response = getResponseText(trial);
  const timedOut = getTimedOut(trial, flags as string[]);
  const codes: CiCode[] = [];

  // F — empty response or timeout
  if (timedOut || response.trim() === "") {
    codes.push("F");
    // Do not add further codes if there is no response
    return codes;
  }

  const normalized = response.trim().toLowerCase();
  const stimulus = stimulusWord.trim().toLowerCase();

  // RSW — echoed back the stimulus word exactly
  if (normalized === stimulus) {
    codes.push("RSW");
  }

  // MSW — response contains internal whitespace (multi-word)
  if (/\s/.test(normalized)) {
    codes.push("MSW");
  }

  // PRT — timing_outlier_slow flag present
  if (flags.includes("timing_outlier_slow")) {
    codes.push("PRT");
  }

  // (P) — repeated_response flag present
  if (flags.includes("repeated_response")) {
    codes.push("(P)");
  }

  return codes;
}

/** Aggregate CI code counts over an array of per-trial code arrays. */
export function aggregateCiCounts(
  perTrialCodes: CiCode[][],
): Partial<Record<CiCode, number>> {
  const counts: Partial<Record<CiCode, number>> = {};
  for (const codes of perTrialCodes) {
    for (const c of codes) {
      counts[c] = (counts[c] ?? 0) + 1;
    }
  }
  return counts;
}
