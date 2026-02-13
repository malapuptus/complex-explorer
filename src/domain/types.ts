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
  /** Reaction time in milliseconds from stimulus display to submit. */
  readonly reactionTimeMs: number;
  /** Time from stimulus display to first keypress (null if no keys pressed). */
  readonly tFirstKeyMs: number | null;
  /** Number of backspace key presses during the trial. */
  readonly backspaceCount: number;
  /** Number of net edits (character insertions + deletions). */
  readonly editCount: number;
  /** Number of IME composition sessions during the trial. */
  readonly compositionCount: number;
}

/** One trial = stimulus + response. */
export interface Trial {
  readonly stimulus: StimulusWord;
  readonly association: AssociationResponse;
  /** If true, this trial is a warm-up and excluded from scoring. */
  readonly isPractice: boolean;
  /** If true, the trial ended via timeout rather than user submission. */
  readonly timedOut?: boolean;
}

/** Order policy for stimulus presentation. */
export type OrderPolicy = "fixed" | "seeded";

/** Configuration for a session run. */
export interface SessionConfig {
  readonly stimulusListId: string;
  readonly stimulusListVersion: string;
  /** Maximum time allowed per word in ms (0 = unlimited). */
  readonly maxResponseTimeMs: number;
  /** How stimulus words are ordered. */
  readonly orderPolicy: OrderPolicy;
  /** Seed for deterministic shuffle (only used when orderPolicy = "seeded"). */
  readonly seed: number | null;
}

/** A completed session with all trials. */
export interface SessionResult {
  readonly id: string;
  readonly config: SessionConfig;
  readonly trials: Trial[];
  readonly startedAt: string; // ISO-8601
  readonly completedAt: string; // ISO-8601
  readonly scoring: SessionScoring;
  /** The seed actually used (null if fixed order). */
  readonly seedUsed: number | null;
  /** The exact scored stimulus order (excluding practice words). */
  readonly stimulusOrder: readonly string[];
  /** Snapshot of the stimulus pack provenance at time of session. */
  readonly provenanceSnapshot: ProvenanceSnapshot | null;
}

/** Frozen copy of stimulus pack metadata at time of session. */
export interface ProvenanceSnapshot {
  readonly listId: string;
  readonly listVersion: string;
  readonly language: string;
  readonly source: string;
  readonly sourceName: string;
  readonly sourceYear: string;
  readonly sourceCitation: string;
  readonly licenseNote: string;
  readonly wordCount: number;
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
  | "repeated_response"
  | "high_editing"
  | "timeout";

export interface SessionSummary {
  readonly totalTrials: number;
  readonly meanReactionTimeMs: number;
  readonly medianReactionTimeMs: number;
  readonly stdDevReactionTimeMs: number;
  readonly emptyResponseCount: number;
  readonly repeatedResponseCount: number;
  readonly timingOutlierCount: number;
  readonly highEditingCount: number;
  readonly timeoutCount: number;
}
