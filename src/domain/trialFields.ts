/**
 * trialFields — pure helpers for extracting trial field values.
 * Single source of truth for response text, timedOut, and input counts.
 * Used by both sessionInsights and ResultsView table renderers.
 * Ticket 0271.
 */

import type { Trial } from "./types";

/** Extract trimmed response text from a trial. */
export function getResponseText(trial: Trial): string {
  return trial.association.response ?? "";
}

/** Length of the trimmed response. */
export function getResponseLen(trial: Trial): number {
  return getResponseText(trial).length;
}

/**
 * Determine whether a trial timed out.
 * Priority: trial.timedOut field (boolean), then flag list contains "timeout" | "timed_out".
 */
export function getTimedOut(trial: Trial, flags: string[]): boolean {
  if (trial.timedOut === true) return true;
  return flags.some((f) => f === "timeout" || f === "timed_out");
}

/** Number of backspace presses. */
export function getBackspaces(trial: Trial): number {
  return trial.association.backspaceCount ?? 0;
}

/** Number of net edits. */
export function getEdits(trial: Trial): number {
  return trial.association.editCount ?? 0;
}

/** Number of IME composition sessions. */
export function getCompositions(trial: Trial): number {
  return trial.association.compositionCount ?? 0;
}

/** Time to first keypress, or null. */
export function getFirstKeyMs(trial: Trial): number | null {
  return trial.association.tFirstKeyMs ?? null;
}
