/**
 * ProtocolScreen — standardized pre-session instructions.
 * T0239: Pack chooser is Step 1; CTA is Step 2 directly beneath the dropdown.
 * T0246: Language shifted to "Experiment"; pack descriptions added.
 * T0247: Exploration/Research mode toggle with persistence.
 * T0248: Consent checkbox gates CTA.
 * Includes an Advanced section for experimental controls.
 * Supports custom pack import/export via ImportSection (0249).
 * ImportPreviewPanel extracted (0244); importedFrom + collision safety (0246, 0247).
 */

import { useState, useEffect } from "react";
import type { OrderPolicy } from "@/domain";
import type { StimulusList } from "@/domain";
import { localStorageStimulusStore, localStorageSessionStore, uiPrefs } from "@/infra";
import { formatKB } from "./ImportPreviewPanel";
import { ImportSection } from "./ImportSection";
import { CustomPackManager } from "./CustomPackManager";
import { WhyPanel } from "./WhyPanel";
import type { PackOption } from "./DemoSessionHelpers";
import { Checkbox } from "@/components/ui/checkbox";

const STORAGE_WARN_BYTES = 3 * 1024 * 1024; // 3 MB

/** Config produced by the Advanced settings panel. */
export interface AdvancedConfig {
  orderPolicy: OrderPolicy;
  seed: number | null;
  breakEveryN: number;
  trialTimeoutMs: number | undefined;
}

export type SessionMode = "exploration" | "research";

interface ProtocolScreenProps {
  wordCount: number;
  practiceCount: number;
  source: string;
  estimatedMinutes: string;
  isLongPack: boolean;
  onReady: (config: AdvancedConfig, mode: SessionMode) => void;
  onPackImported?: () => void;
  selectedPack?: StimulusList | null;
  /** T0239: pack options for the Step 1 chooser */
  packOptions: PackOption[];
  selectedPackKey: string;
  onPackKeyChange: (key: string) => void;
  /** Extra content (e.g. draft-lock warning) */
  notice?: React.ReactNode;
}

const INSTRUCTIONS = [
  "Use a physical keyboard — avoid on-screen keyboards if possible.",
  "Find a quiet environment with minimal distractions.",
  "Respond with the first word that comes to mind — don't overthink it.",
  "Type your response and press Enter to continue.",
  "Mobile or IME input may reduce timing precision.",
] as const;

const DEFAULT_BREAK_EVERY = 20;

/** T0251: Per-pack description + framing. */
function packDescription(packKey: string): { description: string; framing: string } | null {
  if (packKey.startsWith("demo-10@")) {
    return {
      description: "A short sampler — get a feel for the task in about a minute.",
      framing: "UI demo only — not intended for interpretation or pattern analysis.",
    };
  }
  if (packKey.startsWith("kent-rosanoff-1910@")) {
    return {
      description: "The classic Kent–Rosanoff list (1910) — 100 everyday words designed to elicit natural associations.",
      framing: "Historical / public-domain list. No claims of clinical validity.",
    };
  }
  if (packKey.startsWith("practice-100@")) {
    return {
      description: "A broader 100-word set intended for deeper exploration of personal response patterns.",
      framing: "Clinician-provided practice list. No claims of clinical validity.",
    };
  }
  return null;
}

export function ProtocolScreen({
  wordCount, practiceCount, source, estimatedMinutes,
  isLongPack, onReady, onPackImported, selectedPack,
  packOptions, selectedPackKey, onPackKeyChange, notice,
}: ProtocolScreenProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderPolicy, setOrderPolicy] = useState<OrderPolicy>("fixed");
  const [seedInput, setSeedInput] = useState("");
  const [breakEvery, setBreakEvery] = useState(DEFAULT_BREAK_EVERY);
  const [timeoutEnabled, setTimeoutEnabled] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState(8000);
  const [showManager, setShowManager] = useState(false);
  /** T0239: track whether user has explicitly touched the selector */
  const [packExplicitlyChosen, setPackExplicitlyChosen] = useState(false);
  /** T0247: mode toggle */
  const [mode, setMode] = useState<SessionMode>(() => uiPrefs.getSessionMode() ?? "exploration");
  /** T0248: consent checkbox */
  const [consented, setConsented] = useState(false);

  // T0247: persist mode changes
  useEffect(() => {
    uiPrefs.setSessionMode(mode);
  }, [mode]);

  const isDemoPack = selectedPackKey.startsWith("demo-10@");

  const handleReady = () => {
    const parsedSeed =
      orderPolicy === "seeded" && seedInput.trim() !== "" ? parseInt(seedInput.trim(), 10) : null;
    const finalSeed = parsedSeed !== null && !Number.isNaN(parsedSeed) ? parsedSeed : null;
    onReady({
      orderPolicy, seed: finalSeed,
      breakEveryN: isLongPack ? breakEvery : 0,
      trialTimeoutMs: timeoutEnabled ? timeoutMs : undefined,
    }, mode);
  };

  const handlePackChange = (key: string) => {
    setPackExplicitlyChosen(true);
    onPackKeyChange(key);
  };

  const customPacks = localStorageStimulusStore.list();
  const storageSessionBytes = localStorageSessionStore.estimateBytes();
  const storagePackBytes = localStorageStimulusStore.estimateBytes();
  const storageTotalBytes = storageSessionBytes + storagePackBytes;
  const storageWarn = storageTotalBytes > STORAGE_WARN_BYTES;

  // CTA is disabled if (demo pack AND not explicitly chosen) OR consent not given
  const packNotChosen = isDemoPack && !packExplicitlyChosen;
  const ctaDisabled = packNotChosen || !consented;

  const packInfo = packDescription(selectedPackKey);
  // T0251: Provenance from selectedPack
  const provenance = selectedPack?.provenance ?? null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-10">

      {notice}

      {/* Card panel */}
      <div className="w-full max-w-lg rounded-xl border border-border/70 bg-card shadow-md ring-1 ring-border/20 px-8 py-8 space-y-6">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">
          Word Association Experiment
        </h1>

        {/* T0247: Mode toggle */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setMode("exploration")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === "exploration"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Exploration
          </button>
          <button
            type="button"
            onClick={() => setMode("research")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === "research"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Research
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {mode === "exploration"
            ? "Exploration mode — respond freely; timing may be noisy, and that's fine."
            : "Research mode — find a quiet space and respond as consistently as you can."}
        </p>

        {/* ── Step 1: Choose a word list ─────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 1 — Choose a word list
          </p>
          <select
            value={selectedPackKey}
            onChange={(e) => handlePackChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {packOptions.map((p) => (
              <option key={`${p.id}@${p.version}`} value={`${p.id}@${p.version}`}>
                {p.label}
              </option>
            ))}
          </select>

          {/* T0251: Pack details block */}
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{wordCount} words</span>
              <span className="text-xs text-muted-foreground">~{estimatedMinutes}</span>
            </div>
            {packInfo && (
              <>
                <p className="text-xs text-muted-foreground">{packInfo.description}</p>
                <p className="text-[10px] font-medium text-muted-foreground/80 italic">{packInfo.framing}</p>
              </>
            )}
            {provenance && (
              <div className="space-y-0.5 pt-1 border-t border-border/40">
                {provenance.sourceCitation && (
                  <p className="text-[10px] text-muted-foreground"><span className="font-semibold">Citation:</span> {provenance.sourceCitation}</p>
                )}
                {provenance.licenseNote && (
                  <p className="text-[10px] text-muted-foreground"><span className="font-semibold">License:</span> {provenance.licenseNote}</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              You'll start with <strong className="text-foreground">{practiceCount}</strong> warm-up
              words, then see <strong className="text-foreground">{wordCount}</strong> scored words.
            </p>
          </div>
        </div>

        {/* T0248: Consent checkbox */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-check"
            checked={consented}
            onCheckedChange={(v) => setConsented(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="consent-check" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
            I understand this is for personal reflection, not diagnosis, and I can stop anytime.
          </label>
        </div>

        {/* ── Step 2: Start ──────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 2 — Start when ready
          </p>
          <button
            onClick={handleReady}
            disabled={ctaDisabled}
            className="w-full rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {packNotChosen
              ? "Select a word list above to continue"
              : !consented
                ? "Check the box above to continue"
                : "I'm ready — Start"}
          </button>
          {packNotChosen && (
            <p className="text-center text-xs text-muted-foreground">
              Please choose a word list above, then press Start.
            </p>
          )}
        </div>

        {/* Instructions */}
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground">
            <span className="underline">Read instructions before starting ▼</span>
          </summary>
          <ul className="mt-3 space-y-2 rounded-md border border-border/60 bg-muted/30 p-4">
            {INSTRUCTIONS.map((text, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                {text}
              </li>
            ))}
          </ul>
        </details>

        <p className="text-center text-xs text-muted-foreground italic">
          This is not a diagnostic tool. Results are for personal reflection only.
        </p>
      </div>

      {/* T0240: Why panel */}
      <WhyPanel />

      {/* Import section (0249): all import wiring extracted */}
      <ImportSection
        onPackImported={() => { onPackImported?.(); }}
        selectedPack={selectedPack}
      />

      {/* Manage custom packs */}
      {customPacks.length > 0 && (
        <button
          onClick={() => setShowManager((v) => !v)}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          {showManager ? "Hide custom packs" : "Manage custom packs"}
        </button>
      )}

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
          <input
            type="text" inputMode="numeric" value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)} placeholder="Auto-generate"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      )}
      {isLongPack && (
        <div className="flex items-center gap-3">
          <label className="w-28 shrink-0 text-sm text-muted-foreground">Break every:</label>
          <input
            type="number" min={5} max={100} value={breakEvery}
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
            <button
              type="button"
              onClick={() => setTimeoutEnabled(!timeoutEnabled)}
              className={`rounded-md border px-3 py-1.5 text-sm ${timeoutEnabled ? "border-primary bg-primary/10 text-foreground" : "border-input bg-background text-muted-foreground"}`}
            >
              {timeoutEnabled ? "On" : "Off"}
            </button>
          </div>
          {timeoutEnabled && (
            <div className="flex items-center gap-3 pl-[7.75rem]">
              <input
                type="number" min={3000} max={30000} step={1000} value={timeoutMs}
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
