import { useMemo, useCallback } from "react";
import type { Trial, TrialFlag } from "@/domain";
import { generateReflectionPrompts, sessionTrialsToCsv } from "@/domain";

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  meanReactionTimeMs: number;
  medianReactionTimeMs: number;
  onReset: () => void;
  /** Metadata needed for CSV export. If omitted, CSV button is hidden. */
  csvMeta?: {
    sessionId: string;
    packId: string;
    packVersion: string;
    seed: number | null;
  };
}

export function ResultsView({
  trials,
  trialFlags,
  meanReactionTimeMs,
  medianReactionTimeMs,
  onReset,
  csvMeta,
}: Props) {
  const reflectionPrompts = useMemo(
    () => generateReflectionPrompts(trials, trialFlags),
    [trials, trialFlags],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-2 text-2xl font-bold text-foreground">
        Session Results
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Mean RT: {meanReactionTimeMs} ms &middot; Median RT:{" "}
        {medianReactionTimeMs} ms
      </p>

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
                  <td className="px-3 py-2 font-medium text-foreground">
                    {trial.stimulus.word}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {a.response || (
                      <span className="italic text-muted-foreground">
                        (empty)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">
                    {a.tFirstKeyMs !== null ? a.tFirstKeyMs : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">
                    {a.reactionTimeMs}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">
                    {a.backspaceCount}
                  </td>
                  <td className="px-3 py-2">
                    {flags.length > 0 ? (
                      <span className="text-xs text-destructive">
                        {flags.join(", ")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reflectionPrompts.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-semibold text-foreground">
            Explore Further
          </h3>
          <p className="mb-4 text-xs text-muted-foreground italic">
            These prompts are for personal reflection only — they are not
            diagnostic and do not indicate any condition.
          </p>
          <ul className="space-y-3">
            {reflectionPrompts.map((rp, i) => (
              <li
                key={i}
                className="rounded-md border border-border bg-muted/30 px-4 py-3"
              >
                <p className="text-sm text-foreground">{rp.prompt}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Signal: {rp.flag.replace(/_/g, " ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {csvMeta && (
          <button
            onClick={() => {
              const csv = sessionTrialsToCsv(
                trials,
                trialFlags,
                csvMeta.sessionId,
                csvMeta.packId,
                csvMeta.packVersion,
                csvMeta.seed,
              );
              downloadFile(csv, "text/csv", `session-${csvMeta.sessionId}.csv`);
            }}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Export CSV
          </button>
        )}
        <button
          onClick={onReset}
          className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

function downloadFile(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
