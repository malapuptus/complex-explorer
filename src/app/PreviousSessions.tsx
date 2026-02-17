/**
 * PreviousSessions — lists saved sessions with delete/export controls.
 * Shows provenance and reproducibility metadata when viewing a session.
 * Ticket 0262: Storage report. Ticket 0263: Cleanup actions.
 */

import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { SessionListEntry, SessionResult } from "@/domain";
import { sessionResultsToCsv } from "@/domain";
import { localStorageSessionStore, buildStorageReport, uiPrefs } from "@/infra";
import { simulateSession } from "@/domain";
import { ResultsView } from "./ResultsView";

export function PreviousSessions() {
  const [entries, setEntries] = useState<SessionListEntry[]>([]);
  const [selected, setSelected] = useState<SessionResult | null>(null);
  const [cleanupMsg, setCleanupMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const baselineId = uiPrefs.getBaselineSessionId();

  const refresh = useCallback(() => {
    localStorageSessionStore.list().then(setEntries);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 0268: Dev-only simulated session generator
  const handleSimulate = useCallback(async () => {
    const result = simulateSession(Date.now());
    await localStorageSessionStore.save(result);
    refresh();
  }, [refresh]);


  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${entries.length} sessions? This cannot be undone.`)) return;
    await localStorageSessionStore.deleteAll();
    setSelected(null);
    setCleanupMsg(null);
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

  const handleExportCsv = async () => {
    const allEntries = await localStorageSessionStore.list();
    const sessions: SessionResult[] = [];
    for (const entry of allEntries) {
      const s = await localStorageSessionStore.load(entry.id);
      if (s) sessions.push(s);
    }
    const csv = sessionResultsToCsv(sessions);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complex-mapper-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 0262: Export Storage Report as JSON. */
  const handleExportStorageReport = () => {
    const report = buildStorageReport();
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cm_storage_report_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 0263: Delete sessions older than 30 days. */
  const handleDeleteOld = async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const eligible = entries.filter((e) => new Date(e.completedAt) < cutoff).length;
    if (eligible === 0) {
      setCleanupMsg("No sessions older than 30 days.");
      return;
    }
    if (!window.confirm(`Delete ${eligible} session(s) completed before ${cutoff.toLocaleDateString()}? This cannot be undone.`)) return;
    const deleted = await localStorageSessionStore.deleteOlderThan(cutoff);
    setCleanupMsg(`Deleted ${deleted} session(s) older than 30 days.`);
    setSelected(null);
    refresh();
  };

  /** 0263: Delete all imported sessions. */
  const handleDeleteImported = async () => {
    const eligible = entries.filter((e) => {
      return (e as unknown as Record<string, unknown>)._imported === true;
    }).length;
    if (eligible === 0) {
      setCleanupMsg("No imported sessions found.");
      return;
    }
    if (!window.confirm(`Delete ${eligible} imported session(s)? This cannot be undone.`)) return;
    const deleted = await localStorageSessionStore.deleteImported();
    setCleanupMsg(`Deleted ${deleted} imported session(s).`);
    setSelected(null);
    refresh();
  };

  if (selected) {
    const scoredTrials = selected.trials.filter((t) => !t.isPractice);
    const prov = selected.provenanceSnapshot;
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="mb-4 ml-4 mt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to list
        </button>

        {prov && (
          <div className="mx-auto mb-4 max-w-3xl rounded-md border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              Stimulus pack: {prov.listId}@{prov.listVersion} · {prov.wordCount} words ·{" "}
              {prov.language}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{prov.sourceCitation}</p>
            <p className="mt-0.5 text-xs text-muted-foreground italic">{prov.licenseNote}</p>
            {selected.seedUsed !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Order: seeded (seed={selected.seedUsed})
              </p>
            )}
          </div>
        )}

        <ResultsView
          trials={scoredTrials}
          trialFlags={selected.scoring.trialFlags}
          meanReactionTimeMs={selected.scoring.summary.meanReactionTimeMs}
          medianReactionTimeMs={selected.scoring.summary.medianReactionTimeMs}
          onReset={() => setSelected(null)}
          onReproduce={(_config) => {
            navigate("/demo");
          }}
          sessionResult={selected}
          csvMeta={{
            sessionId: selected.id,
            packId: selected.config.stimulusListId,
            packVersion: selected.config.stimulusListVersion,
            seed: selected.seedUsed,
            sessionFingerprint: selected.sessionFingerprint,
            orderPolicy: selected.config.orderPolicy,
            trialTimeoutMs: selected.config.trialTimeoutMs,
            breakEveryN: selected.config.breakEveryN,
            stimulusListHash: selected.stimulusPackSnapshot?.stimulusListHash ?? null,
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Previous Sessions</h1>

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
            {entries.map((entry) => {
              const isImported = (entry as unknown as Record<string, unknown>)._imported === true;
              return (
                <li key={entry.id}>
                  <button
                    onClick={async () => {
                      const s = await localStorageSessionStore.load(entry.id);
                      if (s) setSelected(s);
                    }}
                    className="w-full rounded-md border border-border px-4 py-3 text-left hover:bg-muted"
                  >
                    <span className="font-medium text-foreground">{entry.stimulusListId}</span>
                    {isImported && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        Imported
                      </span>
                    )}
                    {/* 0267: Baseline badge */}
                    {entry.id === baselineId && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                        Baseline
                      </span>
                    )}
                    <span className="ml-4 text-sm text-muted-foreground">
                      {entry.totalTrials} trials &middot;{" "}
                      {new Date(entry.completedAt).toLocaleString()}
                    </span>
                    {/* 0246 + 0252: importedFrom detail row */}
                    {isImported && (() => {
                      const imp = (entry as unknown as { importedFrom?: { packageVersion: string; packageHash: string; originalSessionId?: string } | null }).importedFrom;
                      if (!imp) return null;
                      return (
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          Imported from {imp.packageVersion} (hash: {imp.packageHash.slice(0, 8)}…
                          {imp.originalSessionId ? `, original: ${imp.originalSessionId.slice(0, 8)}…` : ""})
                        </span>
                      );
                    })()}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Cleanup message */}
          {cleanupMsg && (
            <p className="mt-4 text-xs text-muted-foreground">{cleanupMsg}</p>
          )}

          {/* Export actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              Export CSV
            </button>
            {/* 0262: Storage report */}
            <button
              onClick={handleExportStorageReport}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              Export Storage Report
            </button>
            {/* 0268: Dev-only simulate button */}
            {import.meta.env.DEV && (
              <button
                onClick={handleSimulate}
                className="rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Generate simulated session
              </button>
            )}
          </div>

          {/* 0263: Cleanup actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleDeleteOld}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              Delete sessions &gt;30 days old
            </button>
            <button
              onClick={handleDeleteImported}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              Delete imported sessions
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
