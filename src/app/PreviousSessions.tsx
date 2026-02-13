/**
 * PreviousSessions — lists saved sessions and allows opening one.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SessionListEntry, SessionResult } from "@/domain";
import { localStorageSessionStore } from "@/infra";
import { ResultsView } from "./ResultsView";

export function PreviousSessions() {
  const [entries, setEntries] = useState<SessionListEntry[]>([]);
  const [selected, setSelected] = useState<SessionResult | null>(null);

  useEffect(() => {
    localStorageSessionStore.list().then(setEntries);
  }, []);

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="mb-4 ml-4 mt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to list
        </button>
        <ResultsView
          trials={selected.trials}
          trialFlags={selected.scoring.trialFlags}
          meanReactionTimeMs={selected.scoring.summary.meanReactionTimeMs}
          medianReactionTimeMs={selected.scoring.summary.medianReactionTimeMs}
          onReset={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Previous Sessions
      </h1>

      {entries.length === 0 ? (
        <div className="text-center text-muted-foreground">
          <p>No sessions yet.</p>
          <Link
            to="/demo"
            className="mt-4 inline-block rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90"
          >
            Start a Demo
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={async () => {
                  const s = await localStorageSessionStore.load(entry.id);
                  if (s) setSelected(s);
                }}
                className="w-full rounded-md border border-border px-4 py-3 text-left hover:bg-muted"
              >
                <span className="font-medium text-foreground">
                  {entry.stimulusListId}
                </span>
                <span className="ml-4 text-sm text-muted-foreground">
                  {entry.totalTrials} trials &middot;{" "}
                  {new Date(entry.completedAt).toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
