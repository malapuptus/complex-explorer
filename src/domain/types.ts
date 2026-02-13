/**
 * Core domain types for the word-association session.
 * Pure data — no I/O, no UI concerns.
 */

/** A single stimulus word presented to the participant. */
export interface StimulusWord {
  /** The word shown to the participant. */
  readonly word: string;
  /** Optional 0-based position in the list. */
  readonly index: number;
}

/** A single response captured during a trial. */
export interface AssociationResponse {
  /** The word the participant typed (trimmed). Empty string = no response. */
  readonly response: string;
  /** Reaction time in milliseconds (performance.now delta). */
  readonly reactionTimeMs: number;
}

/** One trial = stimulus + response. */
export interface Trial {
  readonly stimulus: StimulusWord;
  readonly association: AssociationResponse;
  /** If true, this trial is a warm-up and excluded from scoring. */
  readonly isPractice: boolean;
}

/** Configuration for a session run. */
export interface SessionConfig {
  readonly stimulusListId: string;
  readonly stimulusListVersion: string;
  /** Maximum time allowed per word in ms (0 = unlimited). */
  readonly maxResponseTimeMs: number;
}

/** A completed session with all trials. */
export interface SessionResult {
  readonly id: string;
  readonly config: SessionConfig;
  readonly trials: Trial[];
  readonly startedAt: string; // ISO-8601
  readonly completedAt: string; // ISO-8601
  readonly scoring: SessionScoring;
}

/** Flags and summaries produced by scoreSession. */
export interface SessionScoring {
  /** Per-trial flags. */
  readonly trialFlags: TrialFlag[];
  /** Session-level summary stats. */
  readonly summary: SessionSummary;
}

/** Possible flags on a single trial. */
export interface TrialFlag {
  readonly trialIndex: number;
  readonly flags: ReadonlyArray<FlagKind>;
}

export type FlagKind =
  | "timing_outlier_slow"
  | "timing_outlier_fast"
  | "empty_response"
  | "repeated_response";

export interface SessionSummary {
  readonly totalTrials: number;
  readonly meanReactionTimeMs: number;
  readonly medianReactionTimeMs: number;
  readonly stdDevReactionTimeMs: number;
  readonly emptyResponseCount: number;
  readonly repeatedResponseCount: number;
  readonly timingOutlierCount: number;
}
