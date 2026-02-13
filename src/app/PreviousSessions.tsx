/**
 * PreviousSessions — lists saved sessions with delete/export controls.
 */

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { SessionListEntry, SessionResult } from "@/domain";
import { localStorageSessionStore } from "@/infra";
import { ResultsView } from "./ResultsView";

export function PreviousSessions() {
  const [entries, setEntries] = useState<SessionListEntry[]>([]);
  const [selected, setSelected] = useState<SessionResult | null>(null);

  const refresh = useCallback(() => {
    localStorageSessionStore.list().then(setEntries);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDeleteAll = async () => {
    await localStorageSessionStore.deleteAll();
    setSelected(null);
    refresh();
  };

  const handleExport = async () => {
    const json = await localStorageSessionStore.exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complex-mapper-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selected) {
    const scoredTrials = selected.trials.filter((t) => !t.isPractice);
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="mb-4 ml-4 mt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to list
        </button>
        <ResultsView
          trials={scoredTrials}
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
        <>
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

          <div className="mt-8 flex gap-3">
            <button
              onClick={handleExport}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              Export JSON
            </button>
            <button
              onClick={handleDeleteAll}
              className="rounded-md border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              Delete all local data
            </button>
          </div>
        </>
      )}
    </div>
  );
}
