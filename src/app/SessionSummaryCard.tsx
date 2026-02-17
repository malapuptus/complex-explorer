/**
 * SessionSummaryCard — compact research snapshot for ResultsView.
 * Displays key stats and provenance without requiring export.
 */

import type { Trial, TrialFlag, OrderPolicy, SessionResult } from "@/domain";

declare const __APP_VERSION__: string;

const SCORING_VERSION = "scoring_v2_mad_3.5";
const EXPORT_SCHEMA_VERSION = "rb_v2";
const APP_VERSION: string | null =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null;

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  meanReactionTimeMs: number;
  medianReactionTimeMs: number;
  sessionResult?: SessionResult;
  csvMeta?: {
    packId: string;
    packVersion: string;
    seed: number | null;
    orderPolicy?: OrderPolicy;
    sessionFingerprint?: string | null;
  };
}

export function SessionSummaryCard({
  trials,
  trialFlags,
  meanReactionTimeMs,
  medianReactionTimeMs,
  sessionResult,
  csvMeta,
}: Props) {
  if (!csvMeta) return null;

  const totalTrials = trials.length;
  const flaggedTrials = trialFlags.filter((tf) => tf.flags.length > 0).length;
  const timeoutCount = trials.filter((t) => t.timedOut).length;

  const firstKeyTimes = trials
    .map((t) => t.association.tFirstKeyMs)
    .filter((t): t is number => t !== null);
  const medianFirstKey =
    firstKeyTimes.length > 0
      ? firstKeyTimes.sort((a, b) => a - b)[Math.floor(firstKeyTimes.length / 2)]
      : null;

  const appVersionLabel = sessionResult?.appVersion
    ? "Saved"
    : APP_VERSION
      ? "Current (fallback)"
      : "Unknown (legacy)";
  const appVersionValue =
    sessionResult?.appVersion ?? APP_VERSION ?? "unknown";

  return (
    <div className="rounded-md border border-border bg-muted/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Session Summary
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
        <Stat label="Pack" value={`${csvMeta.packId}@${csvMeta.packVersion}`} />
        <Stat label="Seed" value={csvMeta.seed != null ? String(csvMeta.seed) : "none"} mono />
        <Stat label="Order" value={csvMeta.orderPolicy ?? "unknown"} />
        <Stat label="Trials" value={String(totalTrials)} mono />
        <Stat label="Flagged" value={String(flaggedTrials)} mono />
        <Stat label="Timeouts" value={String(timeoutCount)} mono />
        <Stat label="Median RT" value={`${medianReactionTimeMs} ms`} mono />
        <Stat label="Mean RT" value={`${meanReactionTimeMs} ms`} mono />
        {medianFirstKey !== null && (
          <Stat label="Median 1st key" value={`${medianFirstKey} ms`} mono />
        )}
        <Stat label="Scoring" value={SCORING_VERSION} mono />
        <Stat label="Export schema" value={EXPORT_SCHEMA_VERSION} mono />
        <Stat label={`App version (${appVersionLabel})`} value={appVersionValue} mono />
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-foreground ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
