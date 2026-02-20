/**
 * ResearchStartRitual — T0258: Pre-run checklist + countdown + fullscreen for Research mode.
 */

import { useState, useEffect, useCallback } from "react";
import { uiPrefs } from "@/infra";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  onReady: () => void;
}

interface RitualPrefs {
  countdownEnabled: boolean;
  fullscreenEnabled: boolean;
}

const RITUAL_PREFS_KEY = "researchRitualPrefs";

function getRitualPrefs(): RitualPrefs {
  try {
    const raw = localStorage.getItem(RITUAL_PREFS_KEY);
    if (!raw) return { countdownEnabled: true, fullscreenEnabled: true };
    return JSON.parse(raw) as RitualPrefs;
  } catch {
    return { countdownEnabled: true, fullscreenEnabled: true };
  }
}

function setRitualPrefs(prefs: RitualPrefs): void {
  try {
    localStorage.setItem(RITUAL_PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

const CHECKLIST_ITEMS = [
  { id: "quiet", label: "Quiet space — minimal distractions" },
  { id: "keyboard", label: "Physical keyboard connected" },
  { id: "interruptions", label: "No interruptions expected" },
  { id: "ready", label: "Ready to proceed" },
] as const;

export function ResearchStartRitual({ onReady }: Props) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [prefs, setPrefs] = useState<RitualPrefs>(getRitualPrefs);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [fullscreenHint, setFullscreenHint] = useState<string | null>(null);

  const allChecked = CHECKLIST_ITEMS.every((item) => checks[item.id]);

  const updatePref = useCallback((partial: Partial<RitualPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...partial };
      setRitualPrefs(next);
      return next;
    });
  }, []);

  const handleStart = useCallback(async () => {
    // Try fullscreen
    if (prefs.fullscreenEnabled) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        setFullscreenHint("Fullscreen blocked by browser — continuing anyway.");
      }
    }

    // Countdown
    if (prefs.countdownEnabled) {
      setCountdown(3);
    } else {
      onReady();
    }
  }, [prefs, onReady]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      onReady();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onReady]);

  // If counting down, show the countdown
  if (countdown !== null && countdown > 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-6xl font-bold text-primary tabular-nums">{countdown}</p>
        <p className="text-sm text-muted-foreground">Starting…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4" data-testid="research-ritual">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Research Mode — Pre-run checklist
      </p>

      <div className="space-y-2.5">
        {CHECKLIST_ITEMS.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <Checkbox
              id={`ritual-${item.id}`}
              checked={checks[item.id] ?? false}
              onCheckedChange={(v) => setChecks((c) => ({ ...c, [item.id]: v === true }))}
            />
            <label htmlFor={`ritual-${item.id}`} className="text-xs text-foreground cursor-pointer">
              {item.label}
            </label>
          </div>
        ))}
      </div>

      {/* Optional toggles */}
      <div className="flex flex-wrap gap-4 border-t border-border pt-3">
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.countdownEnabled}
            onChange={(e) => updatePref({ countdownEnabled: e.target.checked })}
            className="h-3 w-3 rounded border-border"
          />
          3…2…1 countdown
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.fullscreenEnabled}
            onChange={(e) => updatePref({ fullscreenEnabled: e.target.checked })}
            className="h-3 w-3 rounded border-border"
          />
          Go fullscreen
        </label>
      </div>

      {fullscreenHint && (
        <p className="text-[10px] text-muted-foreground italic">{fullscreenHint}</p>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={!allChecked}
        className="w-full rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {allChecked ? "Begin Experiment" : "Complete checklist to continue"}
      </button>
    </div>
  );
}
