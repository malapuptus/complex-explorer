/**
 * RecallRun — T0245: Optional untimed follow-up session.
 * Shows the same stimuli, collects new responses without timing pressure.
 * End screen shows match rate + mismatches list.
 */

import { useState, useCallback, FormEvent } from "react";

export interface RecallResult {
  word: string;
  originalResponse: string;
  recallResponse: string;
  matched: boolean;
}

interface Props {
  /** Ordered list of stimulus words from the original session. */
  words: string[];
  /** Ordered list of original responses (same length as words). */
  originalResponses: string[];
  onComplete: (results: RecallResult[]) => void;
  onCancel: () => void;
}

export function RecallRun({ words, originalResponses, onComplete, onCancel }: Props) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [collected, setCollected] = useState<string[]>([]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const newCollected = [...collected, value.trim()];
      setValue("");
      if (index + 1 >= words.length) {
        const results: RecallResult[] = words.map((word, i) => ({
          word,
          originalResponse: originalResponses[i] ?? "",
          recallResponse: newCollected[i] ?? "",
          matched:
            (newCollected[i] ?? "").toLowerCase().trim() ===
            (originalResponses[i] ?? "").toLowerCase().trim(),
        }));
        onComplete(results);
      } else {
        setCollected(newCollected);
        setIndex(index + 1);
      }
    },
    [collected, index, words, originalResponses, onComplete, value],
  );

  const word = words[index] ?? "";
  const progress = ((index) / words.length) * 100;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Recall Run — Optional
        </span>
        <p className="mt-2 text-sm text-muted-foreground">
          See the same words again. Type whatever comes to mind — no time pressure.
          <br />
          <span className="text-[11px] italic">
            This is not diagnostic. Just a personal reflection exercise.
          </span>
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {index + 1} / {words.length}
        </span>
      </div>

      {/* Stimulus + input */}
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
        <h2 className="text-5xl font-bold tracking-tight text-foreground">{word}</h2>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type the first word that comes to mind…"
          className="w-80 rounded-md border border-input bg-background px-4 py-2 text-center text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90"
        >
          Next
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Cancel recall run
        </button>
      </div>
    </div>
  );
}

// ── RecallSummary ──────────────────────────────────────────────────────

interface SummaryProps {
  results: RecallResult[];
  onDone: () => void;
}

export function RecallSummary({ results, onDone }: SummaryProps) {
  const matchCount = results.filter((r) => r.matched).length;
  const matchRate = results.length > 0 ? Math.round((matchCount / results.length) * 100) : 0;
  const mismatches = results.filter((r) => !r.matched);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 text-center">
        <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Recall Summary — Optional
        </span>
        <div className="mt-3 text-4xl font-bold text-foreground">{matchRate}%</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {matchCount} of {results.length} responses matched your original session.
        </p>
        <p className="mt-2 text-[11px] italic text-muted-foreground">
          This is for personal reflection only — not a diagnostic or memory test.
        </p>
      </div>

      {mismatches.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Differences ({mismatches.length})
          </h3>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Stimulus</th>
                  <th className="px-3 py-2">Original</th>
                  <th className="px-3 py-2">Recall</th>
                </tr>
              </thead>
              <tbody>
                {mismatches.map((r) => (
                  <tr key={r.word} className="border-t border-border">
                    <td className="px-3 py-1.5 font-medium text-foreground">{r.word}</td>
                    <td className="px-3 py-1.5 font-mono text-muted-foreground">
                      {r.originalResponse || <span className="italic">(empty)</span>}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-foreground">
                      {r.recallResponse || <span className="italic text-muted-foreground">(empty)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mismatches.length === 0 && (
        <div className="mb-6 rounded-md border border-border bg-muted/30 px-4 py-3 text-center text-sm text-foreground">
          Perfect recall — all responses matched! 🎉
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onDone}
          className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90"
          data-testid="recall-done-btn"
        >
          Back to Results
        </button>
      </div>
    </div>
  );
}
