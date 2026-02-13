import type { Trial, TrialFlag } from "@/domain";

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  meanReactionTimeMs: number;
  medianReactionTimeMs: number;
  onReset: () => void;
}

export function ResultsView({
  trials,
  trialFlags,
  meanReactionTimeMs,
  medianReactionTimeMs,
  onReset,
}: Props) {
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

      <button
        onClick={onReset}
        className="mt-6 rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90"
      >
        Start Over
      </button>
    </div>
  );
}
