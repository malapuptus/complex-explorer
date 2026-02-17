/**
 * ProtocolScreen — standardized pre-session instructions.
 * Includes an Advanced section for experimental controls.
 * Supports custom pack import/export with collision detection.
 * Supports importing from Research Bundle JSON (auto-detects rb_v3+ payload).
 */

import { useState, useRef } from "react";
import type { ReactNode } from "react";
import type { OrderPolicy, ValidationErrorCode } from "@/domain";
import { validateStimulusList, STIMULUS_SCHEMA_VERSION, computeWordsSha256 } from "@/domain";
import type { StimulusList } from "@/domain";
import { localStorageStimulusStore, localStorageSessionStore } from "@/infra";

/** Human-readable messages for validation error codes. */
const ERROR_CODE_MESSAGES: Record<ValidationErrorCode, string> = {
  MISSING_ID: "Pack ID is required.",
  MISSING_VERSION: "Version is required.",
  MISSING_LANGUAGE: "Language is required.",
  MISSING_SOURCE: "Source is required.",
  MISSING_PROVENANCE: "Provenance metadata is required.",
  MISSING_PROVENANCE_SOURCE_NAME: "Provenance source name is required.",
  MISSING_PROVENANCE_SOURCE_YEAR: "Provenance source year is required.",
  MISSING_PROVENANCE_SOURCE_CITATION: "Provenance citation is required.",
  MISSING_PROVENANCE_LICENSE_NOTE: "Provenance license note is required.",
  EMPTY_WORD_LIST: "Word list must not be empty.",
  BLANK_WORDS: "Word list contains blank entries.",
  DUPLICATE_WORDS: "Word list contains duplicates (case-insensitive).",
};
import { CustomPackManager } from "./CustomPackManager";

const STORAGE_WARN_BYTES = 3 * 1024 * 1024; // 3 MB

/** Config produced by the Advanced settings panel. */
export interface AdvancedConfig {
  orderPolicy: OrderPolicy;
  seed: number | null;
  breakEveryN: number;
  trialTimeoutMs: number | undefined;
}

interface ProtocolScreenProps {
  wordCount: number;
  practiceCount: number;
  source: string;
  estimatedMinutes: string;
  isLongPack: boolean;
  onReady: (config: AdvancedConfig) => void;
  onPackImported?: () => void;
  selectedPack?: StimulusList | null;
  children?: ReactNode;
}

const INSTRUCTIONS = [
  "Use a physical keyboard — avoid on-screen keyboards if possible.",
  "Find a quiet environment with minimal distractions.",
  "Respond with the first word that comes to mind — don't overthink it.",
  "Type your response and press Enter to continue.",
  "Mobile or IME input may reduce timing precision.",
] as const;

const DEFAULT_BREAK_EVERY = 20;

function formatKB(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Try to extract a pack from a Research Bundle JSON (rb_v3+).
 * Returns null if the JSON is not a bundle or lacks pack payload.
 */
function extractPackFromBundle(parsed: Record<string, unknown>): Partial<StimulusList> | null {
  if (typeof parsed.exportSchemaVersion !== "string") return null;
  const snapshot = parsed.stimulusPackSnapshot as Record<string, unknown> | undefined;
  if (!snapshot) return null;
  const words = snapshot.words as string[] | undefined;
  const prov = snapshot.provenance as Record<string, unknown> | undefined;
  if (!Array.isArray(words) || words.length === 0 || !prov) return null;
  return {
    id: prov.listId as string,
    version: prov.listVersion as string,
    language: prov.language as string,
    source: prov.source as string,
    provenance: {
      sourceName: prov.sourceName as string,
      sourceYear: prov.sourceYear as string,
      sourceCitation: prov.sourceCitation as string,
      licenseNote: prov.licenseNote as string,
    },
    words,
    stimulusSchemaVersion: snapshot.stimulusSchemaVersion as string | undefined,
    stimulusListHash: snapshot.stimulusListHash as string | undefined,
  };
}

export function ProtocolScreen({
  wordCount, practiceCount, source, estimatedMinutes,
  isLongPack, onReady, onPackImported, selectedPack, children,
}: ProtocolScreenProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderPolicy, setOrderPolicy] = useState<OrderPolicy>("fixed");
  const [seedInput, setSeedInput] = useState("");
  const [breakEvery, setBreakEvery] = useState(DEFAULT_BREAK_EVERY);
  const [timeoutEnabled, setTimeoutEnabled] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState(8000);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReady = () => {
    const parsedSeed =
      orderPolicy === "seeded" && seedInput.trim() !== "" ? parseInt(seedInput.trim(), 10) : null;
    const finalSeed = parsedSeed !== null && !Number.isNaN(parsedSeed) ? parsedSeed : null;
    onReady({
      orderPolicy, seed: finalSeed,
      breakEveryN: isLongPack ? breakEvery : 0,
      trialTimeoutMs: timeoutEnabled ? timeoutMs : undefined,
    });
  };

  const importPack = (parsed: Record<string, unknown>) => {
    // Auto-detect: is this a Research Bundle?
    const bundlePack = extractPackFromBundle(parsed);
    const packData = bundlePack ?? parsed;

    const errors = validateStimulusList(packData as Partial<StimulusList>);
    if (errors.length > 0) {
      const messages = errors.map((err) => ERROR_CODE_MESSAGES[err.code] ?? err.message);
      setImportError(messages.join("; "));
      return;
    }
    const pack = packData as StimulusList;
    if (localStorageStimulusStore.exists(pack.id, pack.version)) {
      setImportError(
        `Pack "${pack.id}@${pack.version}" already exists. Delete it first to re-import.`,
      );
      return;
    }
    void computeWordsSha256(pack.words as string[]).then((hash) => {
      const enriched: StimulusList = {
        ...pack,
        stimulusSchemaVersion: pack.stimulusSchemaVersion ?? STIMULUS_SCHEMA_VERSION,
        stimulusListHash: pack.stimulusListHash ?? hash,
      };
      if (pack.stimulusListHash && pack.stimulusListHash !== hash) {
        setImportError(
          `Hash mismatch: expected ${pack.stimulusListHash}, computed ${hash}. Pack may be corrupted.`,
        );
        return;
      }
      localStorageStimulusStore.save(enriched);
      const fromBundle = bundlePack ? " (extracted from Research Bundle)" : "";
      setImportSuccess(`Imported "${pack.id}" (${pack.words.length} words)${fromBundle}`);
      onPackImported?.();
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        importPack(parsed);
      } catch {
        setImportError("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportPack = () => {
    if (!selectedPack) return;
    void computeWordsSha256(selectedPack.words).then((hash) => {
      const exported = {
        ...selectedPack,
        stimulusSchemaVersion: selectedPack.stimulusSchemaVersion ?? STIMULUS_SCHEMA_VERSION,
        stimulusListHash: selectedPack.stimulusListHash ?? hash,
      };
      const json = JSON.stringify(exported, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pack-${selectedPack.id}-${selectedPack.version}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const customPacks = localStorageStimulusStore.list();
  const storageSessionBytes = localStorageSessionStore.estimateBytes();
  const storagePackBytes = localStorageStimulusStore.estimateBytes();
  const storageTotalBytes = storageSessionBytes + storagePackBytes;
  const storageWarn = storageTotalBytes > STORAGE_WARN_BYTES;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-3xl font-bold text-foreground">Word Association Task</h1>

      <div className="max-w-lg space-y-4">
        <p className="text-center text-muted-foreground">
          You'll start with <strong className="text-foreground">{practiceCount}</strong> warm-up
          words, then see <strong className="text-foreground">{wordCount}</strong> scored words. For
          each word, type the first association that comes to mind.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Estimated time: <strong className="text-foreground">{estimatedMinutes}</strong>
        </p>
        <ul className="space-y-2 rounded-md border border-border bg-muted/40 p-4">
          {INSTRUCTIONS.map((text, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
              {text}
            </li>
          ))}
        </ul>
        <p className="text-center text-xs text-muted-foreground italic">
          This is not a diagnostic tool. Results are for personal reflection only.
        </p>
        <p className="text-center text-xs text-muted-foreground">Source: {source}</p>
      </div>

      {children}

      {/* Pack tools: import + export + manage */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          Import Pack (JSON / Bundle)
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        {selectedPack && (
          <button onClick={handleExportPack} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            Export Pack JSON
          </button>
        )}
        {customPacks.length > 0 && (
          <button
            onClick={() => setShowManager((v) => !v)}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            {showManager ? "Hide custom packs" : "Manage custom packs"}
          </button>
        )}
      </div>
      {importError && <p className="text-xs text-destructive">{importError}</p>}
      {importSuccess && <p className="text-xs text-primary">{importSuccess}</p>}

      {showManager && (
        <CustomPackManager
          packs={customPacks}
          onChanged={() => { onPackImported?.(); }}
        />
      )}

      {/* Storage pressure indicator */}
      <div className={`text-xs ${storageWarn ? "text-destructive" : "text-muted-foreground"}`}>
        Storage: {formatKB(storageSessionBytes)} sessions, {formatKB(storagePackBytes)} packs
        {storageWarn && " ⚠ approaching browser quota"}
      </div>
      {/* Advanced settings toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-sm text-muted-foreground underline hover:text-foreground"
      >
        {showAdvanced ? "Hide advanced settings" : "Advanced settings"}
      </button>

      {showAdvanced && (
        <AdvancedPanel
          orderPolicy={orderPolicy} setOrderPolicy={setOrderPolicy}
          seedInput={seedInput} setSeedInput={setSeedInput}
          isLongPack={isLongPack} breakEvery={breakEvery} setBreakEvery={setBreakEvery}
          timeoutEnabled={timeoutEnabled} setTimeoutEnabled={setTimeoutEnabled}
          timeoutMs={timeoutMs} setTimeoutMs={setTimeoutMs}
        />
      )}

      <button onClick={handleReady} className="rounded-md bg-primary px-8 py-3 text-lg text-primary-foreground hover:opacity-90">
        I'm ready
      </button>
    </div>
  );
}

/** Extracted advanced settings panel. */
function AdvancedPanel({
  orderPolicy, setOrderPolicy, seedInput, setSeedInput,
  isLongPack, breakEvery, setBreakEvery,
  timeoutEnabled, setTimeoutEnabled, timeoutMs, setTimeoutMs,
}: {
  orderPolicy: OrderPolicy; setOrderPolicy: (v: OrderPolicy) => void;
  seedInput: string; setSeedInput: (v: string) => void;
  isLongPack: boolean; breakEvery: number; setBreakEvery: (v: number) => void;
  timeoutEnabled: boolean; setTimeoutEnabled: (v: boolean) => void;
  timeoutMs: number; setTimeoutMs: (v: number) => void;
}) {
  return (
    <div className="w-full max-w-md space-y-4 rounded-md border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <label className="w-28 shrink-0 text-sm text-muted-foreground">Word order:</label>
        <select
          value={orderPolicy}
          onChange={(e) => setOrderPolicy(e.target.value as OrderPolicy)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="fixed">Fixed</option>
          <option value="seeded">Randomized</option>
        </select>
      </div>
      {orderPolicy === "seeded" && (
        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-sm text-muted-foreground">Seed:</label>
          <input type="text" inputMode="numeric" value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)} placeholder="Auto-generate"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      )}
      {isLongPack && (
        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-sm text-muted-foreground">Break every:</label>
          <input type="number" min={5} max={100} value={breakEvery}
            onChange={(e) => setBreakEvery(Math.max(5, Math.min(100, Number(e.target.value) || 5)))}
            className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          />
          <span className="text-sm text-muted-foreground">trials</span>
        </div>
      )}
      {isLongPack && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="w-28 shrink-0 text-sm text-muted-foreground">Trial timeout:</label>
            <button type="button" onClick={() => setTimeoutEnabled(!timeoutEnabled)}
              className={`rounded-md border px-3 py-1.5 text-sm ${timeoutEnabled ? "border-primary bg-primary/10 text-foreground" : "border-input bg-background text-muted-foreground"}`}
            >
              {timeoutEnabled ? "On" : "Off"}
            </button>
          </div>
          {timeoutEnabled && (
            <div className="flex items-center gap-3 pl-[7.75rem]">
              <input type="number" min={3000} max={30000} step={1000} value={timeoutMs}
                onChange={(e) => setTimeoutMs(Math.max(3000, Math.min(30000, Number(e.target.value) || 3000)))}
                className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
              />
              <span className="text-sm text-muted-foreground">ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
