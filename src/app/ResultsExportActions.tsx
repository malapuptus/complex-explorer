/**
 * ResultsExportActions — export/restore/reproduce buttons for ResultsView.
 * Extracted from ResultsView (Ticket 0213) to keep line counts manageable.
 */

import { useMemo } from "react";
import type { Trial, TrialFlag, OrderPolicy, SessionResult, StimulusPackSnapshot, StimulusList } from "@/domain";
import { sessionTrialsToCsv, getStimulusList } from "@/domain";
import { localStorageStimulusStore } from "@/infra";

declare const __APP_VERSION__: string;

/** Self-contained research bundle for offline reproducibility. */
interface ResearchBundle {
  sessionResult: Record<string, unknown>;
  protocolDocVersion: string;
  appVersion: string | null;
  scoringAlgorithm: string;
  exportSchemaVersion: string;
  exportedAt: string;
  stimulusPackSnapshot?: (StimulusPackSnapshot & { words?: readonly string[] }) | null;
}

export const EXPORT_SCHEMA_VERSION = "rb_v3";
export const PROTOCOL_DOC_VERSION = "PROTOCOL.md@2026-02-13";
export const SCORING_VERSION = "scoring_v2_mad_3.5";
export const SCORING_ALGORITHM = "MAD-modified-z@3.5 + fast<200ms + timeout excluded";
export const APP_VERSION: string | null =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null;

const SIZE_WARN_THRESHOLD = 256 * 1024; // 250 KB

function downloadFile(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SizeLabel({ bytes }: { bytes: number }) {
  const warn = bytes > SIZE_WARN_THRESHOLD;
  return (
    <span className={`ml-1 text-xs ${warn ? "text-destructive" : "text-muted-foreground"}`}>
      ({formatBytes(bytes)}{warn ? " ⚠" : ""})
    </span>
  );
}

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  meanReactionTimeMs: number;
  medianReactionTimeMs: number;
  sessionResult?: SessionResult;
  csvMeta: {
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
  persistedSnapshot: StimulusPackSnapshot | null;
  packIsInstalled: boolean;
  onReproduce?: (config: {
    packId: string;
    packVersion: string;
    seed: number | null;
    orderPolicy: OrderPolicy;
    trialTimeoutMs?: number;
    breakEveryN?: number;
  }) => void;
  onReset: () => void;
}

/** Resolve the full word list for the bundle (best-effort). */
function resolvePackWords(
  csvMeta: Props["csvMeta"],
  sessionResult?: SessionResult,
): readonly string[] | null {
  // 1. Try installed pack
  const builtIn = getStimulusList(csvMeta.packId, csvMeta.packVersion);
  if (builtIn) return builtIn.words;
  const custom = localStorageStimulusStore.load(csvMeta.packId, csvMeta.packVersion);
  if (custom) return custom.words;
  // 2. Fall back to session's stimulus order (scored words only)
  if (sessionResult?.stimulusOrder && sessionResult.stimulusOrder.length > 0) {
    return sessionResult.stimulusOrder;
  }
  return null;
}

export function ExportActions({
  trials, trialFlags, meanReactionTimeMs, medianReactionTimeMs,
  sessionResult, csvMeta, persistedSnapshot, packIsInstalled,
  onReproduce, onReset,
}: Props) {
  const csvContent = useMemo(() =>
    sessionTrialsToCsv(trials, trialFlags, csvMeta.sessionId, csvMeta.packId,
      csvMeta.packVersion, csvMeta.seed, csvMeta.sessionFingerprint, SCORING_VERSION),
    [trials, trialFlags, csvMeta],
  );

  const bundleJson = useMemo(() => {
    const bundleSession = sessionResult
      ? {
          id: sessionResult.id, config: sessionResult.config,
          trials: sessionResult.trials, scoring: sessionResult.scoring,
          sessionFingerprint: sessionResult.sessionFingerprint,
          provenanceSnapshot: sessionResult.provenanceSnapshot,
          stimulusOrder: sessionResult.stimulusOrder,
          seedUsed: sessionResult.seedUsed,
          scoringVersion: sessionResult.scoringVersion,
          startedAt: sessionResult.startedAt,
          completedAt: sessionResult.completedAt,
        }
      : {
          id: csvMeta.sessionId,
          config: {
            stimulusListId: csvMeta.packId, stimulusListVersion: csvMeta.packVersion,
            orderPolicy: csvMeta.orderPolicy ?? "fixed", seed: csvMeta.seed,
            ...(csvMeta.trialTimeoutMs !== undefined && { trialTimeoutMs: csvMeta.trialTimeoutMs }),
            ...(csvMeta.breakEveryN !== undefined && { breakEveryN: csvMeta.breakEveryN }),
          },
          trials, scoring: { trialFlags, summary: { meanReactionTimeMs, medianReactionTimeMs } },
          sessionFingerprint: csvMeta.sessionFingerprint ?? null,
        };

    const baseSnapshot = persistedSnapshot ?? {
      stimulusListHash: csvMeta.stimulusListHash ?? null,
      stimulusSchemaVersion: null,
      provenance: sessionResult?.provenanceSnapshot ?? null,
    };
    const words = resolvePackWords(csvMeta, sessionResult);
    const snapshotWithWords = { ...baseSnapshot, ...(words ? { words } : {}) };

    const bundle: ResearchBundle = {
      sessionResult: bundleSession,
      protocolDocVersion: PROTOCOL_DOC_VERSION,
      appVersion: APP_VERSION,
      scoringAlgorithm: SCORING_ALGORITHM,
      exportSchemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      stimulusPackSnapshot: snapshotWithWords,
    };
    return JSON.stringify(bundle, null, 2);
  }, [trials, trialFlags, meanReactionTimeMs, medianReactionTimeMs, sessionResult, csvMeta, persistedSnapshot]);

  const snapshotJson = useMemo(() =>
    persistedSnapshot ? JSON.stringify(persistedSnapshot, null, 2) : null,
    [persistedSnapshot],
  );

  // Restore gating: only when we have provenance + words from stimulusOrder
  const canRestore = !!(
    persistedSnapshot && !packIsInstalled &&
    persistedSnapshot.provenance &&
    sessionResult?.stimulusOrder && sessionResult.stimulusOrder.length > 0
  );

  const handleRestore = () => {
    if (!canRestore || !persistedSnapshot?.provenance || !sessionResult?.stimulusOrder) return;
    const prov = persistedSnapshot.provenance;
    const restoredPack: StimulusList = {
      id: prov.listId, version: prov.listVersion,
      language: prov.language, source: prov.source,
      provenance: {
        sourceName: prov.sourceName, sourceYear: prov.sourceYear,
        sourceCitation: prov.sourceCitation, licenseNote: prov.licenseNote,
      },
      words: sessionResult.stimulusOrder as string[],
      stimulusSchemaVersion: persistedSnapshot.stimulusSchemaVersion ?? "sp_v1",
      stimulusListHash: persistedSnapshot.stimulusListHash ?? undefined,
    };
    if (localStorageStimulusStore.exists(restoredPack.id, restoredPack.version)) return;
    localStorageStimulusStore.save(restoredPack);
    alert(`Pack "${restoredPack.id}@${restoredPack.version}" restored from this session (${restoredPack.words.length} words). Note: only scored words are included; practice words are not in the snapshot.`);
  };

  const bundleFn = () => {
    const fp = csvMeta.sessionFingerprint?.slice(0, 8) ?? "";
    const seedPart = csvMeta.seed != null ? `seed${csvMeta.seed}` : "noseed";
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = ["bundle", datePart, csvMeta.packId, seedPart, ...(fp ? [fp] : [])].join("-") + ".json";
    downloadFile(bundleJson, "application/json", filename);
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        onClick={() => downloadFile(csvContent, "text/csv", `session-${csvMeta.sessionId}.csv`)}
        className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
      >
        Export CSV <SizeLabel bytes={csvContent.length} />
      </button>
      <button onClick={bundleFn}
        className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
      >
        Export Research Bundle <SizeLabel bytes={bundleJson.length} />
      </button>
      {snapshotJson && (
        <button
          onClick={() => downloadFile(snapshotJson, "application/json", `pack-snapshot-${csvMeta.packId}.json`)}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Export Pack Snapshot <SizeLabel bytes={snapshotJson.length} />
        </button>
      )}
      {canRestore && (
        <button onClick={handleRestore}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Restore pack from this session
        </button>
      )}
      {persistedSnapshot && !packIsInstalled && !canRestore && (
        <p className="text-xs text-muted-foreground italic">
          Pack not installed. Snapshot contains only hash + provenance — insufficient to restore the full word list.
        </p>
      )}
      {onReproduce && (
        <button
          onClick={() => onReproduce({
            packId: csvMeta.packId, packVersion: csvMeta.packVersion,
            seed: csvMeta.seed, orderPolicy: csvMeta.orderPolicy ?? "fixed",
            trialTimeoutMs: csvMeta.trialTimeoutMs, breakEveryN: csvMeta.breakEveryN,
          })}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Run again with same settings
        </button>
      )}
      <button onClick={onReset} className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90">
        Start Over
      </button>
    </div>
  );
}
