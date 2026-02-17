import { useMemo, useCallback, useState } from "react";
import type { Trial, TrialFlag, OrderPolicy, SessionResult, StimulusPackSnapshot } from "@/domain";
import { generateReflectionPrompts, getStimulusList } from "@/domain";
import { localStorageStimulusStore } from "@/infra";
import { SessionSummaryCard } from "./SessionSummaryCard";
import { ExportActions, SCORING_VERSION, APP_VERSION } from "./ResultsExportActions";

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  meanReactionTimeMs: number;
  medianReactionTimeMs: number;
  onReset: () => void;
  onReproduce?: (config: {
    packId: string;
    packVersion: string;
    seed: number | null;
    orderPolicy: OrderPolicy;
    trialTimeoutMs?: number;
    breakEveryN?: number;
  }) => void;
  sessionResult?: SessionResult;
  csvMeta?: {
    sessionId: string;
    packId: string;
    packVersion: string;
    seed: number | null;
    sessionFingerprint?: string | null;
    orderPolicy?: OrderPolicy;
    trialTimeoutMs?: number;
    breakEveryN?: number;
    stimulusListHash?: string | null;
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.body.removeChild(el);
    }
  }, [text]);
  return (
    <button onClick={handleCopy} className="ml-2 rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function ResultsView({
  trials, trialFlags, meanReactionTimeMs, medianReactionTimeMs,
  onReset, onReproduce, sessionResult, csvMeta,
}: Props) {
  const reflectionPrompts = useMemo(
    () => generateReflectionPrompts(trials, trialFlags),
    [trials, trialFlags],
  );

  const persistedSnapshot: StimulusPackSnapshot | null = useMemo(() => {
    if (sessionResult?.stimulusPackSnapshot) return sessionResult.stimulusPackSnapshot;
    if (csvMeta?.stimulusListHash) {
      return {
        stimulusListHash: csvMeta.stimulusListHash,
        stimulusSchemaVersion: null,
        provenance: sessionResult?.provenanceSnapshot ?? null,
      };
    }
    return null;
  }, [sessionResult, csvMeta]);

  const packIsInstalled = useMemo(() => {
    if (!csvMeta) return false;
    if (getStimulusList(csvMeta.packId, csvMeta.packVersion)) return true;
    return localStorageStimulusStore.exists(csvMeta.packId, csvMeta.packVersion);
  }, [csvMeta]);

  const reproBundle = useMemo(() => {
    if (!csvMeta) return null;
    const lines = [
      `Fingerprint: ${csvMeta.sessionFingerprint ?? "n/a"}`,
      `Pack: ${csvMeta.packId}@${csvMeta.packVersion}`,
      `Seed: ${csvMeta.seed ?? "none"}`,
      `Order: ${csvMeta.orderPolicy ?? "unknown"}`,
      `Scoring: ${SCORING_VERSION}`,
    ];
    if (csvMeta.trialTimeoutMs !== undefined) lines.push(`Timeout: ${csvMeta.trialTimeoutMs}ms`);
    if (csvMeta.breakEveryN !== undefined) lines.push(`Break every: ${csvMeta.breakEveryN}`);
    return lines.join("\n");
  }, [csvMeta]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-2 text-2xl font-bold text-foreground">Session Results</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Mean RT: {meanReactionTimeMs} ms &middot; Median RT: {medianReactionTimeMs} ms
      </p>

      {csvMeta && reproBundle && (
        <div className="mb-6 rounded-md border border-border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Reproducibility Bundle</h3>
            <CopyButton text={reproBundle} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Fingerprint</dt>
            <dd className="font-mono text-foreground break-all">{csvMeta.sessionFingerprint ?? "n/a"}</dd>
            <dt className="text-muted-foreground">Pack</dt>
            <dd className="text-foreground">{csvMeta.packId}@{csvMeta.packVersion}</dd>
            <dt className="text-muted-foreground">Seed</dt>
            <dd className="font-mono text-foreground">{csvMeta.seed ?? "none"}</dd>
            <dt className="text-muted-foreground">Order</dt>
            <dd className="text-foreground">{csvMeta.orderPolicy ?? "unknown"}</dd>
            <dt className="text-muted-foreground">Scoring</dt>
            <dd className="font-mono text-foreground">{SCORING_VERSION}</dd>
            <dt className="text-muted-foreground">
              {sessionResult?.appVersion ? "Saved app version" : APP_VERSION ? "Current app version (fallback)" : "App version"}
            </dt>
            <dd className="font-mono text-foreground">
              {sessionResult?.appVersion ?? APP_VERSION ?? "unknown (legacy)"}
            </dd>
            {persistedSnapshot && (
              <>
                <dt className="text-muted-foreground">Pack hash</dt>
                <dd className="font-mono text-foreground break-all">{persistedSnapshot.stimulusListHash ?? "n/a"}</dd>
                <dt className="text-muted-foreground">Pack schema</dt>
                <dd className="font-mono text-foreground">{persistedSnapshot.stimulusSchemaVersion ?? "n/a"}</dd>
              </>
            )}
            {csvMeta.trialTimeoutMs !== undefined && (
              <><dt className="text-muted-foreground">Timeout</dt><dd className="text-foreground">{csvMeta.trialTimeoutMs}ms</dd></>
            )}
            {csvMeta.breakEveryN !== undefined && (
              <><dt className="text-muted-foreground">Break every</dt><dd className="text-foreground">{csvMeta.breakEveryN} trials</dd></>
            )}
          </dl>
        </div>
      )}

      {csvMeta && (
        <div className="mb-6">
          <SessionSummaryCard
            trials={trials} trialFlags={trialFlags}
            meanReactionTimeMs={meanReactionTimeMs} medianReactionTimeMs={medianReactionTimeMs}
            sessionResult={sessionResult} csvMeta={csvMeta}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Stimulus</th>
              <th className="px-3 py-2">Response</th>
              <th className="px-3 py-2 text-right">1st Key</th>
              <th className="px-3 py-2 text-right">Submit</th>
              <th className="px-3 py-2 text-right">BS</th>
              <th className="px-3 py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {trials.map((trial, i) => {
              const flags = trialFlags[i]?.flags ?? [];
              const a = trial.association;
              return (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{trial.stimulus.word}</td>
                  <td className="px-3 py-2 text-foreground">
                    {a.response || <span className="italic text-muted-foreground">(empty)</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">{a.tFirstKeyMs !== null ? a.tFirstKeyMs : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">{a.reactionTimeMs}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">{a.backspaceCount}</td>
                  <td className="px-3 py-2">
                    {flags.length > 0
                      ? <span className="text-xs text-destructive">{flags.join(", ")}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reflectionPrompts.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-semibold text-foreground">Explore Further</h3>
          <p className="mb-4 text-xs text-muted-foreground italic">
            These prompts are for personal reflection only — they are not diagnostic and do not indicate any condition.
          </p>
          <ul className="space-y-3">
            {reflectionPrompts.map((rp, i) => (
              <li key={i} className="rounded-md border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm text-foreground">{rp.prompt}</p>
                <p className="mt-1 text-xs text-muted-foreground">Signal: {rp.flag.replace(/_/g, " ")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {csvMeta && (
        <ExportActions
          trials={trials} trialFlags={trialFlags}
          meanReactionTimeMs={meanReactionTimeMs} medianReactionTimeMs={medianReactionTimeMs}
          sessionResult={sessionResult} csvMeta={csvMeta}
          persistedSnapshot={persistedSnapshot} packIsInstalled={packIsInstalled}
          onReproduce={onReproduce} onReset={onReset}
        />
      )}
      {!csvMeta && (
        <div className="mt-6">
          <button onClick={onReset} className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90">
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
