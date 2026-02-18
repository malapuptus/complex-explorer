/**
 * ObserverMode — a large-button UI for clinicians sitting with the participant.
 * Allows quick per-trial manual indicator tagging without disrupting the session.
 * Ticket 0285.
 *
 * Usage: Render alongside or above the results table. The observer can cycle
 * through trials and tag them in real-time or post-hoc.
 *
 * Design constraints:
 *   - Large tap targets (≥ 44px) for use on tablets.
 *   - Keyboard-navigable (arrow keys for next/prev trial).
 *   - Persists via localStorageTrialAnnotations; never writes to SessionResult.
 *   - Manual indicators NEVER collide with auto indicators (different type space).
 */

import { useState, useCallback, useEffect } from "react";
import type { TrialRef } from "@/domain";
import { trialAnnotations } from "@/infra";
import type { ManualIndicatorCode } from "@/infra";
import {
  MANUAL_INDICATOR_ORDER,
  MANUAL_INDICATOR_LABELS,
  MANUAL_INDICATOR_EXPLANATIONS,
} from "@/infra/localStorageTrialAnnotations";

interface Props {
  /** Ordered list of trial refs for the session (scored only). */
  trialRefs: TrialRef[];
  /** Session ID for annotation persistence. */
  sessionId: string;
  /** Optional initial trial index (0-based position in trialRefs). */
  initialPosition?: number;
}

export function ObserverMode({ trialRefs, sessionId, initialPosition = 0 }: Props) {
  const [position, setPosition] = useState(
    Math.max(0, Math.min(initialPosition, trialRefs.length - 1)),
  );
  const [manualTags, setManualTags] = useState<ManualIndicatorCode[]>([]);
  const [note, setNote] = useState("");

  const currentRef = trialRefs[position] ?? null;

  // Load annotation for the current trial
  useEffect(() => {
    if (!currentRef) return;
    const ann = trialAnnotations.getAnnotation(sessionId, currentRef.sessionTrialIndex);
    setManualTags(ann?.manualIndicators ?? []);
    setNote(ann?.note ?? "");
  }, [currentRef?.sessionTrialIndex, sessionId]);

  const save = useCallback(
    (nextTags: ManualIndicatorCode[], nextNote: string) => {
      if (!currentRef) return;
      const existing = trialAnnotations.getAnnotation(sessionId, currentRef.sessionTrialIndex);
      trialAnnotations.setAnnotation(sessionId, currentRef.sessionTrialIndex, {
        tags: existing?.tags ?? [],
        note: nextNote,
        manualIndicators: nextTags,
      });
    },
    [currentRef, sessionId],
  );

  const toggleTag = useCallback(
    (code: ManualIndicatorCode) => {
      const next = manualTags.includes(code)
        ? manualTags.filter((t) => t !== code)
        : [...manualTags, code];
      setManualTags(next);
      save(next, note);
    },
    [manualTags, note, save],
  );

  const handleNoteChange = useCallback(
    (v: string) => {
      setNote(v);
      save(manualTags, v);
    },
    [manualTags, save],
  );

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, trialRefs.length - 1));
      setPosition(clamped);
    },
    [trialRefs.length],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo(position + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo(position - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [position, goTo]);

  if (trialRefs.length === 0) {
    return (
      <div
        data-testid="observer-mode"
        className="rounded-md border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground"
      >
        No trials available.
      </div>
    );
  }

  return (
    <div
      data-testid="observer-mode"
      className="rounded-md border border-border bg-card p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Observer Mode</h3>
        <span className="text-xs text-muted-foreground">
          {position + 1} / {trialRefs.length}
        </span>
      </div>

      {/* Current trial display */}
      {currentRef && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Stimulus</p>
          <p
            data-testid="observer-stimulus-word"
            className="text-2xl font-bold tracking-wide text-foreground"
          >
            {currentRef.word}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            Response:{" "}
            {currentRef.response || (
              <span className="italic">(empty)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            RT: {currentRef.reactionTimeMs} ms
          </p>
        </div>
      )}

      {/* Manual indicator buttons */}
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Manual indicators</p>
        <div className="flex flex-wrap gap-2" data-testid="observer-indicator-buttons">
          {MANUAL_INDICATOR_ORDER.map((code) => {
            const active = manualTags.includes(code);
            return (
              <button
                key={code}
                data-testid={`observer-tag-${code}`}
                onClick={() => toggleTag(code)}
                title={MANUAL_INDICATOR_EXPLANATIONS[code]}
                className={`min-h-[44px] min-w-[56px] rounded-md border px-3 py-1.5 text-sm font-mono font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                aria-pressed={active}
                aria-label={`${MANUAL_INDICATOR_LABELS[code]} (${code})`}
              >
                {code}
              </button>
            );
          })}
        </div>
        {manualTags.length > 0 && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Tagged:{" "}
            {manualTags.map((t) => MANUAL_INDICATOR_LABELS[t]).join(", ")}
            {" · "}
            <span className="text-xs text-muted-foreground/60">source: manual</span>
          </p>
        )}
      </div>

      {/* Note */}
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Observer note</p>
        <textarea
          data-testid="observer-note"
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Optional observation note…"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          data-testid="observer-prev"
          onClick={() => goTo(position - 1)}
          disabled={position === 0}
          className="min-h-[44px] flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="shrink-0 text-xs font-mono text-muted-foreground">
          #{currentRef?.position != null ? currentRef.position + 1 : "—"}
        </span>
        <button
          data-testid="observer-next"
          onClick={() => goTo(position + 1)}
          disabled={position === trialRefs.length - 1}
          className="min-h-[44px] flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
