/**
 * DebriefScreen — T0249: short debrief step after the run,
 * before showing interpretive results.
 */

import { useState } from "react";
import { HomeBar } from "./HomeBar";

const FEELING_CHIPS = ["Calm", "Curious", "Surprised", "Uneasy", "Energized", "Neutral"] as const;

interface Props {
  onContinue: (debrief: { feeling: string | null; note: string }) => void;
}

export function DebriefScreen({ onContinue }: Props) {
  const [feeling, setFeeling] = useState<string | null>(null);
  const [note, setNote] = useState("");

  return (
    <>
      <HomeBar />
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-border/70 bg-card shadow-md ring-1 ring-border/20 px-8 py-8 space-y-6">
          <h2 className="text-center text-xl font-semibold tracking-tight text-foreground">
            Before your results…
          </h2>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">How do you feel right now?</p>
            <div className="flex flex-wrap gap-2">
              {FEELING_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setFeeling(feeling === chip ? null : chip)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    feeling === chip
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Anything you noticed? <span className="italic">(optional)</span></p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A word that stuck with me, something unexpected…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            onClick={() => onContinue({ feeling, note })}
            className="w-full rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:opacity-90"
          >
            Continue to Results
          </button>

          <p className="text-center text-xs text-muted-foreground italic">
            This is not a diagnostic tool. Results are for personal reflection only.
          </p>
        </div>
      </div>
    </>
  );
}
