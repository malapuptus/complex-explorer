/**
 * csvExport — converts session data to CSV format.
 * Pure function, no I/O. No diagnostic language.
 */

import type { SessionResult, Trial, TrialFlag } from "./types";

const CSV_HEADERS = [
  "session_id",
  "session_fingerprint",
  "scoring_version",
  "pack_id",
  "pack_version",
  "seed",
  "order_index",
  "word",
  "warmup",
  "response",
  "t_first_input_ms",
  "t_submit_ms",
  "backspaces",
  "edits",
  "compositions",
  "timed_out",
  "flags",
] as const;

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function trialToCsvRow(
  sessionId: string,
  sessionFingerprint: string | null,
  scoringVersion: string | null,
  packId: string,
  packVersion: string,
  seed: number | null,
  trial: Trial,
  flags: readonly string[],
): string {
  const a = trial.association;
  const values: string[] = [
    sessionId,
    sessionFingerprint ?? "",
    scoringVersion ?? "",
    packId,
    packVersion,
    seed !== null ? String(seed) : "",
    String(trial.stimulus.index),
    trial.stimulus.word,
    trial.isPractice ? "true" : "false",
    escapeCsv(a.response),
    a.tFirstKeyMs !== null ? String(a.tFirstKeyMs) : "",
    String(a.reactionTimeMs),
    String(a.backspaceCount),
    String(a.editCount),
    String(a.compositionCount),
    trial.timedOut ? "true" : "false",
    escapeCsv(flags.join("; ")),
  ];
  return values.join(",");
}

/** Export a single session's trials as CSV. */
export function sessionTrialsToCsv(
  trials: Trial[],
  trialFlags: TrialFlag[],
  sessionId: string,
  packId: string,
  packVersion: string,
  seed: number | null,
  sessionFingerprint?: string | null,
  scoringVersion?: string | null,
): string {
  const rows = [CSV_HEADERS.join(",")];
  for (let i = 0; i < trials.length; i++) {
    const flags = trialFlags[i]?.flags ?? [];
    rows.push(
      trialToCsvRow(
        sessionId,
        sessionFingerprint ?? null,
        scoringVersion ?? null,
        packId,
        packVersion,
        seed,
        trials[i],
        flags,
      ),
    );
  }
  return rows.join("\n");
}

/** Export multiple complete SessionResults as a single CSV. */
export function sessionResultsToCsv(sessions: SessionResult[]): string {
  const rows = [CSV_HEADERS.join(",")];
  for (const s of sessions) {
    const packId = s.config.stimulusListId;
    const packVersion = s.config.stimulusListVersion;
    for (let i = 0; i < s.trials.length; i++) {
      const flags = s.scoring.trialFlags[i]?.flags ?? [];
      rows.push(
        trialToCsvRow(
          s.id,
          s.sessionFingerprint ?? null,
          s.scoringVersion ?? null,
          packId,
          packVersion,
          s.seedUsed,
          s.trials[i],
          flags,
        ),
      );
    }
  }
  return rows.join("\n");
}
