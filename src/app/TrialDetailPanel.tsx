/**
 * TrialDetailPanel — dialog showing full details for a single trial.
 * Ticket 0266. Updated 0279 (self-tags). T0254 (emotions + complexes).
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { TrialRef, FlagKind } from "@/domain";
import { trialAnnotations } from "@/infra";
import type { SelfTagCode } from "@/infra";
import { SELF_TAG_ORDER, SELF_TAG_LABELS } from "@/infra/localStorageTrialAnnotations";

interface Props {
  trialRef: TrialRef | null;
  onClose: () => void;
  /** Session ID for annotation persistence (0279). */
  sessionId?: string;
  /** T0254: existing candidate complex labels in this session for reuse. */
  existingComplexLabels?: string[];
}

const FLAG_LABELS: Record<string, string> = {
  empty_response: "Empty response",
  timeout: "Timed out",
  timed_out: "Timed out",
  timing_outlier_slow: "Unusually slow",
  timing_outlier_fast: "Unusually fast",
  repeated_response: "Repeated response",
  high_editing: "High editing",
};

const DEFAULT_EMOTIONS = [
  "anxious", "sad", "angry", "shame", "joy", "disgust", "fear", "numb",
];

function flagLabel(f: FlagKind): string {
  return FLAG_LABELS[f as string] ?? f;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={`text-right text-xs text-foreground${mono ? " font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function TrialDetailPanel({ trialRef, onClose, sessionId, existingComplexLabels = [] }: Props) {
  const [tags, setTags] = useState<SelfTagCode[]>([]);
  const [note, setNote] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [complexes, setComplexes] = useState<string[]>([]);
  const [customEmotion, setCustomEmotion] = useState("");
  const [newComplex, setNewComplex] = useState("");

  // Load annotation when trial changes
  useEffect(() => {
    if (!trialRef || !sessionId) { setTags([]); setNote(""); setEmotions([]); setComplexes([]); return; }
    const ann = trialAnnotations.getAnnotation(sessionId, trialRef.sessionTrialIndex);
    setTags(ann?.tags ?? []);
    setNote(ann?.note ?? "");
    setEmotions(ann?.emotions ?? []);
    setComplexes(ann?.candidateComplexes ?? []);
  }, [trialRef?.sessionTrialIndex, sessionId]);

  const persist = useCallback((t: SelfTagCode[], n: string, em: string[], cx: string[]) => {
    if (!trialRef || !sessionId) return;
    trialAnnotations.setAnnotation(sessionId, trialRef.sessionTrialIndex, {
      tags: t, note: n, emotions: em, candidateComplexes: cx,
    });
  }, [trialRef, sessionId]);

  const handleTagToggle = useCallback((tag: SelfTagCode) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
    persist(next, note, emotions, complexes);
  }, [tags, note, emotions, complexes, persist]);

  const handleNoteChange = useCallback((v: string) => {
    setNote(v);
    persist(tags, v, emotions, complexes);
  }, [tags, emotions, complexes, persist]);

  const toggleEmotion = useCallback((em: string) => {
    const next = emotions.includes(em) ? emotions.filter((e) => e !== em) : [...emotions, em];
    setEmotions(next);
    persist(tags, note, next, complexes);
  }, [tags, note, emotions, complexes, persist]);

  const addCustomEmotion = useCallback(() => {
    const trimmed = customEmotion.trim().toLowerCase();
    if (!trimmed || emotions.includes(trimmed)) { setCustomEmotion(""); return; }
    const next = [...emotions, trimmed];
    setEmotions(next);
    setCustomEmotion("");
    persist(tags, note, next, complexes);
  }, [customEmotion, tags, note, emotions, complexes, persist]);

  const toggleComplex = useCallback((label: string) => {
    const next = complexes.includes(label) ? complexes.filter((c) => c !== label) : [...complexes, label];
    setComplexes(next);
    persist(tags, note, emotions, next);
  }, [tags, note, emotions, complexes, persist]);

  const addNewComplex = useCallback(() => {
    const trimmed = newComplex.trim();
    if (!trimmed || complexes.includes(trimmed)) { setNewComplex(""); return; }
    const next = [...complexes, trimmed];
    setComplexes(next);
    setNewComplex("");
    persist(tags, note, emotions, next);
  }, [newComplex, tags, note, emotions, complexes, persist]);

  // Merge existing session labels with current trial's labels for the complex chip set
  const allComplexLabels = [...new Set([...existingComplexLabels, ...complexes])].sort();

  return (
    <Dialog open={trialRef !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Trial detail — <span className="font-mono">{trialRef?.word ?? ""}</span>
          </DialogTitle>
          <DialogDescription>Detailed metrics for this trial.</DialogDescription>
        </DialogHeader>

        {trialRef && (
          <div className="mt-2 space-y-0">
            <Row label="Word" value={trialRef.word} />
            <Row label="Order index" value={trialRef.orderIndex} mono />
            <Row label="Position" value={trialRef.position} mono />
            <Row
              label="Response"
              value={
                trialRef.response.length > 0
                  ? trialRef.response
                  : <span className="italic text-muted-foreground">(empty)</span>
              }
            />
            <Row label="Reaction time" value={`${trialRef.reactionTimeMs} ms`} mono />
            <Row
              label="Time to first key"
              value={trialRef.tFirstKeyMs !== null ? `${trialRef.tFirstKeyMs} ms` : "—"}
              mono
            />
            {trialRef.timedOut && (
              <Row
                label="Timed out"
                value={
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                    TIMEOUT
                  </span>
                }
              />
            )}
            <Row label="Backspaces" value={trialRef.backspaces} mono />
            <Row label="Edits" value={trialRef.edits} mono />
            <Row label="Compositions" value={trialRef.compositions} mono />
            <Row
              label="Flags"
              value={
                trialRef.flags.length > 0 ? (
                  <ul className="space-y-0.5">
                    {trialRef.flags.map((f) => (
                      <li key={f} className="text-destructive">
                        {flagLabel(f)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />

            {/* 0279: Self-tags section */}
            {sessionId && (
              <div className="border-t border-border pt-2">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Self-tags</p>
                <div
                  className="flex flex-wrap gap-2"
                  data-testid="self-tags-section"
                >
                  {SELF_TAG_ORDER.map((tag) => (
                    <label
                      key={tag}
                      className="flex cursor-pointer items-center gap-1 text-xs text-foreground"
                    >
                      <input
                        type="checkbox"
                        data-testid={`self-tag-${tag}`}
                        checked={tags.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      <span className="font-mono font-semibold">{tag}</span>
                      <span className="text-muted-foreground">{SELF_TAG_LABELS[tag]}</span>
                    </label>
                  ))}
                </div>
                <textarea
                  data-testid="self-tag-note"
                  value={note}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Optional note…"
                  rows={2}
                  className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            {/* T0254: Emotions section */}
            {sessionId && (
              <div className="border-t border-border pt-2">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Emotions</p>
                <div className="flex flex-wrap gap-1.5" data-testid="emotions-section">
                  {DEFAULT_EMOTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => toggleEmotion(em)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        emotions.includes(em)
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                  {/* Custom emotions already added */}
                  {emotions.filter((e) => !DEFAULT_EMOTIONS.includes(e)).map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => toggleEmotion(em)}
                      className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-medium"
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-1">
                  <input
                    type="text"
                    value={customEmotion}
                    onChange={(e) => setCustomEmotion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomEmotion(); } }}
                    placeholder="Add custom…"
                    className="w-full rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* T0254: Candidate complexes section */}
            {sessionId && (
              <div className="border-t border-border pt-2">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Candidate complexes</p>
                <div className="flex flex-wrap gap-1.5" data-testid="complexes-section">
                  {allComplexLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleComplex(label)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        complexes.includes(label)
                          ? "bg-accent text-accent-foreground"
                          : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-1">
                  <input
                    type="text"
                    value={newComplex}
                    onChange={(e) => setNewComplex(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewComplex(); } }}
                    placeholder="Add new…"
                    className="w-full rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
