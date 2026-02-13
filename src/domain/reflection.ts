/**
 * generateReflectionPrompts — produces journaling prompts from flagged trials.
 * Pure function, deterministic, no diagnostic claims.
 */

import type { Trial, TrialFlag, FlagKind } from "./types";

/** A single reflection prompt tied to one or more trials. */
export interface ReflectionPrompt {
  /** The stimulus word(s) that triggered this prompt. */
  readonly words: readonly string[];
  /** The flag that triggered this prompt. */
  readonly flag: FlagKind;
  /** Human-readable reflection question. */
  readonly prompt: string;
}

const FLAG_TEMPLATES: Record<FlagKind, (words: string) => string> = {
  timing_outlier_slow: (w) =>
    `You took notably longer on "${w}." What came up for you around that word?`,
  timing_outlier_fast: (w) =>
    `Your response to "${w}" was very quick. Was this word immediately familiar, or did you feel rushed?`,
  empty_response: (w) =>
    `You left "${w}" blank. Did nothing come to mind, or did something hold you back?`,
  repeated_response: (w) =>
    `You gave the same response for "${w}" as an earlier word. What connection do you notice between them?`,
  high_editing: (w) => `You edited your response to "${w}" several times. What were you weighing?`,
  timeout: (w) => `Time ran out on "${w}" before you responded. What was going through your mind?`,
};

/**
 * Generate reflection prompts from scored trial flags.
 *
 * Rules:
 * - Only scored (non-practice) trials are considered.
 * - Each unique (word, flag) pair produces at most one prompt.
 * - Prompts are returned in trial order.
 * - Maximum 8 prompts to avoid overwhelming the user.
 *
 * @returns Deterministic output — same input always produces same output.
 */
export function generateReflectionPrompts(
  trials: Trial[],
  trialFlags: TrialFlag[],
): ReflectionPrompt[] {
  const scoredTrials = trials.filter((t) => !t.isPractice);
  const prompts: ReflectionPrompt[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < scoredTrials.length && prompts.length < 8; i++) {
    const trial = scoredTrials[i];
    const flags = trialFlags[i]?.flags ?? [];
    const word = trial.stimulus.word;

    for (const flag of flags) {
      const key = `${word}:${flag}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const template = FLAG_TEMPLATES[flag];
      if (!template) continue;

      prompts.push({
        words: [word],
        flag,
        prompt: template(word),
      });

      if (prompts.length >= 8) break;
    }
  }

  return prompts;
}
