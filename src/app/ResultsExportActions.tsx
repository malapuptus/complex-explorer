/**
 * ResultsExportActions — export/restore/reproduce buttons for ResultsView.
 * Extracted from ResultsView (Ticket 0213). Privacy manifest added (0223).
 * Redacted bundle (0224), session package (0227) added.
 * Privacy switchboard (0229), deterministic ordering (0228),
 * package integrity (0231) added.
 */

import { useState, useMemo } from "react";
import type { Trial, TrialFlag, OrderPolicy, SessionResult, StimulusPackSnapshot, StimulusList } from "@/domain";
import { sessionTrialsToCsv, getStimulusList } from "@/domain";
import { localStorageStimulusStore } from "@/infra";

declare const __APP_VERSION__: string;

/** Privacy manifest embedded in every bundle. */
export interface PrivacyManifest {
  mode: "full" | "minimal" | "redacted";
  includesStimulusWords: boolean;
  includesResponses: boolean;
}

/** Self-contained research bundle for offline reproducibility. */
export interface ResearchBundle {
  sessionResult: Record<string, unknown>;
  protocolDocVersion: string;
  appVersion: string | null;
  scoringAlgorithm: string;
  exportSchemaVersion: string;
  exportedAt: string;
  stimulusPackSnapshot?: (StimulusPackSnapshot & { words?: readonly string[] }) | null;
  privacy: PrivacyManifest;
}

export const EXPORT_SCHEMA_VERSION = "rb_v3";
export const PROTOCOL_DOC_VERSION = "PROTOCOL.md@2026-02-13";
export const SCORING_VERSION = "scoring_v2_mad_3.5";
export const SCORING_ALGORITHM = "MAD-modified-z@3.5 + fast<200ms + timeout excluded";
export const APP_VERSION: string | null =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null;

const SIZE_WARN_THRESHOLD = 256 * 1024; // 250 KB

/** Deterministic key order for bundles. */
const BUNDLE_KEY_ORDER = [
  "exportSchemaVersion", "exportedAt", "protocolDocVersion", "appVersion",
  "scoringAlgorithm", "privacy", "sessionResult", "stimulusPackSnapshot",
] as const;

/** Deterministic key order for packages. */
const PACKAGE_KEY_ORDER = [
  "packageVersion", "packageHash", "hashAlgorithm", "exportedAt",
  "bundle", "csv", "csvRedacted",
] as const;

/** Stringify with stable key ordering. */
export function stableStringify(obj: unknown, keyOrder?: readonly string[]): string {
  return JSON.stringify(obj, keyOrder ? createKeyReplacer(keyOrder) : undefined, 2);
}

function createKeyReplacer(topLevelOrder: readonly string[]) {
  let isRoot = true;
  return function replacer(this: unknown, _key: string, value: unknown): unknown {
    if (isRoot && typeof value === "object" && value !== null && !Array.isArray(value)) {
      isRoot = false;
      const ordered: Record<string, unknown> = {};
      for (const k of topLevelOrder) {
        if (k in (value as Record<string, unknown>)) {
          ordered[k] = (value as Record<string, unknown>)[k];
        }
      }
      for (const k of Object.keys(value as Record<string, unknown>)) {
        if (!(k in ordered)) {
          ordered[k] = (value as Record<string, unknown>)[k];
        }
      }
      return ordered;
    }
    return value;
  };
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

/** Short privacy summary for a bundle mode. */
function PrivacyNote({ mode }: { mode: "full" | "minimal" | "redacted" }) {
  const text = mode === "full"
    ? "Includes stimulus words + responses"
    : mode === "minimal"
    ? "Omits stimulus words, includes responses"
    : "Omits responses, omits stimulus words";
  return <span className="block text-xs text-muted-foreground">{text}</span>;
}

/** Compute SHA-256 hex digest of a string (browser SubtleCrypto). */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
  const builtIn = getStimulusList(csvMeta.packId, csvMeta.packVersion);
  if (builtIn) return builtIn.words;
  const custom = localStorageStimulusStore.load(csvMeta.packId, csvMeta.packVersion);
  if (custom) return custom.words;
  if (sessionResult?.stimulusOrder && sessionResult.stimulusOrder.length > 0) {
    return sessionResult.stimulusOrder;
  }
  return null;
}

type BundleMode = "full" | "minimal" | "redacted";

/** Anonymize a bundle: blank IDs and timestamps, keep hashes.
 * Uses fingerprint (or fallback) for collision-safe anonymous ID (0241). */
export function anonymizeBundle(bundle: ResearchBundle): ResearchBundle {
  const sr = bundle.sessionResult as Record<string, unknown>;
  const fingerprint = sr.sessionFingerprint as string | null;
  const anonId = fingerprint
    ? `anon_${fingerprint.slice(0, 12)}`
    : `anon_${Date.now().toString(36)}`;
  return {
    ...bundle,
    exportedAt: "",
    sessionResult: {
      ...sr,
      id: anonId,
      startedAt: "",
      completedAt: "",
    },
  };
}

/** Redact trials: blank all responses. */
function redactTrials(trials: Trial[]): Trial[] {
  return trials.map((t) => ({
    ...t,
    association: { ...t.association, response: "" },
  }));
}

/** Build a bundle for the given mode. Exported for testing. */
export function buildBundleObject(
  mode: BundleMode,
  trials: Trial[],
  trialFlags: TrialFlag[],
  meanReactionTimeMs: number,
  medianReactionTimeMs: number,
  sessionResult: SessionResult | undefined,
  csvMeta: Props["csvMeta"],
  persistedSnapshot: StimulusPackSnapshot | null,
  exportedAt: string,
): ResearchBundle {
  const isRedacted = mode === "redacted";
  const sessionTrials = isRedacted
    ? redactTrials(sessionResult?.trials ?? trials)
    : (sessionResult?.trials ?? trials);

  const bundleSession = sessionResult
    ? {
        id: sessionResult.id, config: sessionResult.config,
        trials: sessionTrials, scoring: sessionResult.scoring,
        sessionFingerprint: sessionResult.sessionFingerprint,
        provenanceSnapshot: sessionResult.provenanceSnapshot,
        stimulusOrder: sessionResult.stimulusOrder,
        seedUsed: sessionResult.seedUsed,
        scoringVersion: sessionResult.scoringVersion,
        appVersion: sessionResult.appVersion ?? null,
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
        trials: isRedacted ? redactTrials(trials) : trials,
        scoring: { trialFlags, summary: { meanReactionTimeMs, medianReactionTimeMs } },
        sessionFingerprint: csvMeta.sessionFingerprint ?? null,
      };

  const baseSnapshot = persistedSnapshot ?? {
    stimulusListHash: csvMeta.stimulusListHash ?? null,
    stimulusSchemaVersion: null,
    provenance: sessionResult?.provenanceSnapshot ?? null,
  };

  const includesWords = mode === "full";
  let snapshot: ResearchBundle["stimulusPackSnapshot"];
  if (includesWords) {
    const words = resolvePackWords(csvMeta, sessionResult);
    snapshot = { ...baseSnapshot, ...(words ? { words } : {}) };
  } else {
    snapshot = {
      stimulusListHash: baseSnapshot.stimulusListHash,
      stimulusSchemaVersion: baseSnapshot.stimulusSchemaVersion,
      provenance: baseSnapshot.provenance,
    };
  }

  const privacy: PrivacyManifest = {
    mode,
    includesStimulusWords: includesWords,
    includesResponses: !isRedacted,
  };

  return {
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    protocolDocVersion: PROTOCOL_DOC_VERSION,
    appVersion: APP_VERSION,
    scoringAlgorithm: SCORING_ALGORITHM,
    privacy,
    sessionResult: bundleSession,
    stimulusPackSnapshot: snapshot,
  };
}

export function ExportActions({
  trials, trialFlags, meanReactionTimeMs, medianReactionTimeMs,
  sessionResult, csvMeta, persistedSnapshot, packIsInstalled,
  onReproduce, onReset,
}: Props) {
  const [privacyMode, setPrivacyMode] = useState<BundleMode>("full");
  const [anonymize, setAnonymize] = useState(false);
  const csvContent = useMemo(() =>
    sessionTrialsToCsv(trials, trialFlags, csvMeta.sessionId, csvMeta.packId,
      csvMeta.packVersion, csvMeta.seed, csvMeta.sessionFingerprint, SCORING_VERSION),
    [trials, trialFlags, csvMeta],
  );

  const csvRedacted = useMemo(() =>
    sessionTrialsToCsv(trials, trialFlags, csvMeta.sessionId, csvMeta.packId,
      csvMeta.packVersion, csvMeta.seed, csvMeta.sessionFingerprint, SCORING_VERSION,
      { redactResponses: true }),
    [trials, trialFlags, csvMeta],
  );

  /** Build bundle for selected privacy mode. */
  const bundle = useMemo(() => {
    const b = buildBundleObject(privacyMode, trials, trialFlags, meanReactionTimeMs,
      medianReactionTimeMs, sessionResult, csvMeta, persistedSnapshot,
      anonymize ? "" : new Date().toISOString());
    if (anonymize) return anonymizeBundle(b);
    return b;
  }, [privacyMode, trials, trialFlags, meanReactionTimeMs, medianReactionTimeMs, sessionResult, csvMeta, persistedSnapshot, anonymize]);

  const bundleJson = useMemo(() => stableStringify(bundle, BUNDLE_KEY_ORDER), [bundle]);

  /** Session Package: envelope with bundle + CSV matching privacy mode. */
  const packageJson = useMemo(() => {
    const csvForMode = privacyMode === "redacted" ? csvRedacted : csvContent;
    const pkg: Record<string, unknown> = {
      packageVersion: "pkg_v1",
      packageHash: "",
      hashAlgorithm: "sha-256",
      exportedAt: new Date().toISOString(),
      bundle,
      csv: csvForMode,
      csvRedacted,
    };
    // packageHash is computed async, leave placeholder for size estimate
    return stableStringify(pkg, PACKAGE_KEY_ORDER);
  }, [bundle, csvContent, csvRedacted, privacyMode]);

  const snapshotJson = useMemo(() =>
    persistedSnapshot ? JSON.stringify(persistedSnapshot, null, 2) : null,
    [persistedSnapshot],
  );

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
    alert(`Pack "${restoredPack.id}@${restoredPack.version}" restored (${restoredPack.words.length} words).`);
  };

  const handleBundle = () => {
    const fp = csvMeta.sessionFingerprint?.slice(0, 8) ?? "";
    const seedPart = csvMeta.seed != null ? `seed${csvMeta.seed}` : "noseed";
    const datePart = new Date().toISOString().slice(0, 10);
    const suffix = privacyMode === "full" ? "" : `-${privacyMode}`;
    const filename = ["bundle", datePart, csvMeta.packId, seedPart, ...(fp ? [fp] : [])].join("-") + suffix + ".json";
    downloadFile(bundleJson, "application/json", filename);
  };

  const handlePackage = async () => {
    const csvForMode = privacyMode === "redacted" ? csvRedacted : csvContent;
    const pkg: Record<string, unknown> = {
      packageVersion: "pkg_v1",
      packageHash: "",
      hashAlgorithm: "sha-256",
      exportedAt: new Date().toISOString(),
      bundle,
      csv: csvForMode,
      csvRedacted,
    };
    // Compute hash of everything except packageHash itself
    const forHash = { ...pkg, packageHash: undefined };
    delete forHash.packageHash;
    const canonical = stableStringify(forHash, PACKAGE_KEY_ORDER);
    pkg.packageHash = await sha256Hex(canonical);

    const json = stableStringify(pkg, PACKAGE_KEY_ORDER);
    const fp = csvMeta.sessionFingerprint?.slice(0, 8) ?? "";
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = ["session-package", datePart, csvMeta.packId, ...(fp ? [fp] : [])].join("-") + ".json";
    downloadFile(json, "application/json", filename);
  };

  return (
    <div className="mt-6 space-y-3">
      {/* Privacy mode selector (0229) */}
      <div className="flex items-center gap-3">
        <label id="privacy-mode-label" className="text-sm text-muted-foreground">Privacy mode:</label>
        <div className="inline-flex rounded-md border border-border" role="radiogroup" aria-labelledby="privacy-mode-label">
          {(["full", "minimal", "redacted"] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={privacyMode === m}
              onClick={() => setPrivacyMode(m)}
              onKeyDown={(e) => {
                const modes = ["full", "minimal", "redacted"] as const;
                const idx = modes.indexOf(privacyMode);
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  setPrivacyMode(modes[(idx + 1) % 3]);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setPrivacyMode(modes[(idx + 2) % 3]);
                }
              }}
              tabIndex={privacyMode === m ? 0 : -1}
              className={`px-3 py-1.5 text-xs capitalize ${
                privacyMode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              } ${m === "full" ? "rounded-l-md" : m === "redacted" ? "rounded-r-md" : ""}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <PrivacyNote mode={privacyMode} />

      {/* Anonymize toggle (0235) */}
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={anonymize}
          onChange={(e) => setAnonymize(e.target.checked)}
          className="h-4 w-4 rounded border-border"
          aria-label="Anonymize identifiers in exports"
        />
        Anonymize identifiers
        <span className="text-xs">(blanks session ID, timestamps; keeps hashes)</span>
      </label>

      {/* CSV exports */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => downloadFile(csvContent, "text/csv", `session-${csvMeta.sessionId}.csv`)}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Export CSV <SizeLabel bytes={csvContent.length} />
        </button>
        <button
          onClick={() => downloadFile(csvRedacted, "text/csv", `session-${csvMeta.sessionId}-redacted.csv`)}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Export CSV (Redacted) <SizeLabel bytes={csvRedacted.length} />
        </button>
      </div>

      {/* Bundle + Package */}
      <div className="flex flex-wrap gap-3">
        <div>
          <button onClick={handleBundle}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Export Bundle ({privacyMode}) <SizeLabel bytes={bundleJson.length} />
          </button>
        </div>
        <button onClick={handlePackage}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Export Session Package <SizeLabel bytes={packageJson.length} />
        </button>
      </div>

      {/* Snapshot + Restore */}
      <div className="flex flex-wrap gap-3">
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
            Pack not installed. Snapshot insufficient to restore.
          </p>
        )}
      </div>

      {/* Reproduce + Reset */}
      <div className="flex flex-wrap gap-3">
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
    </div>
  );
}

/** Verify a session package's integrity by recomputing the hash. */
export async function verifyPackageIntegrity(
  pkg: Record<string, unknown>,
): Promise<{ valid: boolean; expected: string; actual: string }> {
  const expected = pkg.packageHash as string;
  const forHash = { ...pkg, packageHash: undefined };
  delete forHash.packageHash;
  const canonical = stableStringify(forHash, PACKAGE_KEY_ORDER);
  const actual = await sha256Hex(canonical);
  return { valid: actual === expected, expected, actual };
}
