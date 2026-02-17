/**
 * ProtocolScreen — standardized pre-session instructions.
 * Includes an Advanced section for experimental controls.
 */

import { useState } from "react";
import type { ReactNode } from "react";
import type { OrderPolicy } from "@/domain";

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
  /** If true, break/timeout controls are shown (hidden for tiny packs). */
  isLongPack: boolean;
  onReady: (config: AdvancedConfig) => void;
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

export function ProtocolScreen({
  wordCount,
  practiceCount,
  source,
  estimatedMinutes,
  isLongPack,
  onReady,
  children,
}: ProtocolScreenProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderPolicy, setOrderPolicy] = useState<OrderPolicy>("fixed");
  const [seedInput, setSeedInput] = useState("");
  const [breakEvery, setBreakEvery] = useState(DEFAULT_BREAK_EVERY);
  const [timeoutEnabled, setTimeoutEnabled] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState(8000);

  const handleReady = () => {
    const parsedSeed =
      orderPolicy === "seeded" && seedInput.trim() !== "" ? parseInt(seedInput.trim(), 10) : null;
    const finalSeed = parsedSeed !== null && !Number.isNaN(parsedSeed) ? parsedSeed : null;

    onReady({
      orderPolicy,
      seed: finalSeed,
      breakEveryN: isLongPack ? breakEvery : 0,
      trialTimeoutMs: timeoutEnabled ? timeoutMs : undefined,
    });
  };

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

      {/* Advanced settings toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-sm text-muted-foreground underline hover:text-foreground"
      >
        {showAdvanced ? "Hide advanced settings" : "Advanced settings"}
      </button>

      {showAdvanced && (
        <div className="w-full max-w-md space-y-4 rounded-md border border-border bg-muted/30 p-4">
          {/* Order policy */}
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

          {/* Seed input (only when seeded) */}
          {orderPolicy === "seeded" && (
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-sm text-muted-foreground">Seed:</label>
              <input
                type="text"
                inputMode="numeric"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Auto-generate"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
          )}

          {/* Break interval (long packs only) */}
          {isLongPack && (
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-sm text-muted-foreground">Break every:</label>
              <input
                type="number"
                min={5}
                max={100}
                value={breakEvery}
                onChange={(e) =>
                  setBreakEvery(Math.max(5, Math.min(100, Number(e.target.value) || 5)))
                }
                className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
              />
              <span className="text-sm text-muted-foreground">trials</span>
            </div>
          )}

          {/* Timeout */}
          {isLongPack && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="w-28 shrink-0 text-sm text-muted-foreground">
                  Trial timeout:
                </label>
                <button
                  type="button"
                  onClick={() => setTimeoutEnabled((v) => !v)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    timeoutEnabled
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input bg-background text-muted-foreground"
                  }`}
                >
                  {timeoutEnabled ? "On" : "Off"}
                </button>
              </div>
              {timeoutEnabled && (
                <div className="flex items-center gap-3 pl-[7.75rem]">
                  <input
                    type="number"
                    min={3000}
                    max={30000}
                    step={1000}
                    value={timeoutMs}
                    onChange={(e) =>
                      setTimeoutMs(Math.max(3000, Math.min(30000, Number(e.target.value) || 3000)))
                    }
                    className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
                  />
                  <span className="text-sm text-muted-foreground">ms</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleReady}
        className="rounded-md bg-primary px-8 py-3 text-lg text-primary-foreground hover:opacity-90"
      >
        I'm ready
      </button>
    </div>
  );
}
