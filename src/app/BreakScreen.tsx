/**
 * BreakScreen — shown every N scored trials to reduce fatigue.
 * T0241: HomeBar added. T0248: Stop & Ground.
 */

import { useState } from "react";
import { HomeBar } from "./HomeBar";
import { StopGroundDialog } from "./StopGroundDialog";
import type { SessionMode } from "./ProtocolScreen";

interface Props {
  completedScored: number;
  totalScored: number;
  onContinue: () => void;
  sessionMode?: SessionMode;
  onEndSession?: () => void;
}

export function BreakScreen({ completedScored, totalScored, onContinue, sessionMode, onEndSession }: Props) {
  const remaining = totalScored - completedScored;
  const [stopDialogOpen, setStopDialogOpen] = useState(false);

  return (
    <>
      <HomeBar confirmLeave />
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 pt-10">
        <h2 className="text-2xl font-bold text-foreground">Take a Break</h2>
        <p className="max-w-sm text-center text-muted-foreground">
          You've completed <strong className="text-foreground">{completedScored}</strong> of{" "}
          <strong className="text-foreground">{totalScored}</strong> words. {remaining} remaining.
        </p>
        <p className="text-sm text-muted-foreground">
          Take a moment to rest. Press continue when you're ready.
        </p>
        <div className="flex gap-3">
          <button
            autoFocus
            onClick={onContinue}
            className="rounded-md bg-primary px-8 py-3 text-lg text-primary-foreground hover:opacity-90"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => setStopDialogOpen(true)}
            className="rounded-md border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
          >
            Stop &amp; Ground
          </button>
        </div>
      </div>

      <StopGroundDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
        onResume={() => {}}
        onEnd={() => { onEndSession?.(); window.location.href = "/"; }}
        showTimingWarning={sessionMode === "research"}
      />
    </>
  );
}
