/**
 * WhyPanel — collapsible "Why this is valuable / How to read results" panel.
 * T0240: non-clinical, plain-English explanation for first-time users.
 */

import { useState } from "react";

export function WhyPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-lg rounded-md border border-border/60 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <span className="font-medium">What does this task measure?</span>
        <span aria-hidden className="text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">What it measures</p>
            <p>
              How quickly certain words "grab" your attention. Words you respond to faster
              or more slowly than your own average may carry personal significance.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">What you get</p>
            <p>
              A map of response-time spikes and clusters you can reflect on — like a
              mirror, not a verdict. You decide what, if anything, the pattern means.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">What it is not</p>
            <p>
              This is not a diagnostic tool. Results are not clinically interpreted and
              do not indicate any psychological condition.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Navigating the app</p>
            <p>
              You can return to the Home screen at any time using the{" "}
              <strong>← Home</strong> button in the top-left corner.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
