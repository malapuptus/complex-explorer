/**
 * HomeBar — persistent top-left "Home" wayfinding control for post-Protocol screens.
 * T0241: visible on RunningTrial, BreakScreen, ResultsView, PreviousSessions.
 * Shows a confirmation dialog when a session is in progress.
 * Uses a plain <a> anchor (not react-router Link) so it works in test contexts
 * where no Router is present.
 */

import { useState } from "react";

interface HomeBarProps {
  /** If true, clicking Home shows a "Leave session?" confirmation. */
  confirmLeave?: boolean;
  /** Called after the user confirms they want to leave (optional). */
  onLeave?: () => void;
}

export function HomeBar({ confirmLeave = false, onLeave }: HomeBarProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirmLeave && confirming) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-b border-border bg-card/95 px-4 py-2 shadow-sm backdrop-blur-sm">
        <span className="text-sm text-foreground">Leave this session? Progress will be lost.</span>
        <div className="flex gap-2">
          <a
            href="/"
            onClick={onLeave}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:opacity-90"
          >
            Leave
          </a>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            Stay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 z-40 p-3">
      {confirmLeave ? (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-3 py-1.5 text-sm text-foreground shadow-sm backdrop-blur-sm hover:bg-muted"
          aria-label="Go to Home"
        >
          <span aria-hidden>←</span> Home
        </button>
      ) : (
        <a
          href="/"
          className="flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-3 py-1.5 text-sm text-foreground shadow-sm backdrop-blur-sm hover:bg-muted"
          aria-label="Go to Home"
        >
          <span aria-hidden>←</span> Home
        </a>
      )}
    </div>
  );
}
