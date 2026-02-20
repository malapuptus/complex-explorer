/**
 * InterpretationGuidePanel — T0252: mode-aware interpretation + retest guide.
 * Collapsed by default.
 */

import { useState } from "react";
import type { SessionMode } from "./ProtocolScreen";

interface Props {
  sessionMode?: SessionMode;
}

export function InterpretationGuidePanel({ sessionMode }: Props) {
  const [open, setOpen] = useState(false);
  const isResearch = sessionMode === "research";

  return (
    <div className="rounded-md border border-border bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        data-testid="interpretation-guide-toggle"
      >
        <span className="text-sm font-semibold text-foreground">
          How to interpret this (and what to watch out for)
        </span>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4 text-xs text-muted-foreground">
          {/* Framing */}
          {isResearch ? (
            <p className="text-foreground font-medium">
              Research mode — focus on consistency, replication, and controlled conditions. 
              Interpret results cautiously; timing noise from environment or device can create misleading patterns.
            </p>
          ) : (
            <p className="text-foreground font-medium">
              Exploration mode — treat these results as signals, not conclusions. 
              Use them as starting points for journaling, reflection, or conversation — not as definitive answers.
            </p>
          )}

          {/* What this measures */}
          <div>
            <h4 className="font-semibold text-foreground mb-1">What this experiment measures</h4>
            <p>
              Reaction time (how quickly you respond to each word) and association patterns 
              (which words you connect, and where responses repeat or cluster). 
              Longer pauses or unusual responses may reflect personal significance — or simply unfamiliarity.
            </p>
          </div>

          {/* What flags mean */}
          <div>
            <h4 className="font-semibold text-foreground mb-1">What "flags" mean</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-foreground">Slow outlier:</strong> Your response time was significantly above your personal median (MAD-based detection).</li>
              <li><strong className="text-foreground">Repeated response:</strong> You gave the same word for multiple stimuli — may indicate a theme or simply a common association.</li>
              <li><strong className="text-foreground">Perseveration candidate:</strong> Slow responses cluster after a particular word, suggesting it may have "stuck" with you.</li>
              <li><strong className="text-foreground">Empty / timeout:</strong> No response was entered, possibly indicating blocking or hesitation.</li>
            </ul>
          </div>

          {/* Common false positives */}
          <div>
            <h4 className="font-semibold text-foreground mb-1">Common false positives</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-foreground">Fatigue:</strong> Response times naturally increase toward the end of a long session.</li>
              <li><strong className="text-foreground">Distractions:</strong> A phone notification or noise can spike a single trial.</li>
              <li><strong className="text-foreground">Unfamiliar words:</strong> A word you don't know will be slow — that's vocabulary, not emotional significance.</li>
              <li><strong className="text-foreground">Keyboard / mobile:</strong> Touch typing vs. hunt-and-peck creates large RT differences unrelated to the stimulus.</li>
              <li><strong className="text-foreground">Interruptions:</strong> Leaving the tab or switching apps inflates timing artificially.</li>
            </ul>
          </div>

          {/* Retest protocol */}
          <div>
            <h4 className="font-semibold text-foreground mb-1">Retest protocol</h4>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Use the same word list (pack) each time.</li>
              <li>Run at a similar time of day in a similar environment.</li>
              <li>Repeat 2–3 runs over days or weeks.</li>
              <li>Compare: which flags and slow words appear consistently across runs?</li>
              <li>Consistent patterns are more meaningful than one-off spikes.</li>
            </ol>
          </div>

          {/* Triangulation */}
          <div>
            <h4 className="font-semibold text-foreground mb-1">Triangulation suggestions</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Compare your debrief notes with the flagged words — do any themes overlap?</li>
              <li>Look for recurring themes across repeated responses (e.g., words that keep triggering the same association).</li>
              <li>Use the Recall Run to see which associations "stuck" and which drifted — drift may indicate areas worth exploring.</li>
              {isResearch && (
                <li>For research use: document your environmental conditions, device, and any interruptions alongside each run.</li>
              )}
            </ul>
          </div>

          <p className="italic text-muted-foreground/80 pt-2 border-t border-border/40">
            This tool is for personal reflection and pattern-finding only — it is not a diagnostic instrument.
          </p>
        </div>
      )}
    </div>
  );
}
