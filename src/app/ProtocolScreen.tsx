/**
 * ProtocolScreen — standardized pre-session instructions.
 * Ensures consistent measurement conditions before trials begin.
 */

import type { ReactNode } from "react";

interface ProtocolScreenProps {
  wordCount: number;
  practiceCount: number;
  source: string;
  onReady: () => void;
  children?: ReactNode;
}

const INSTRUCTIONS = [
  "Use a physical keyboard — avoid on-screen keyboards if possible.",
  "Find a quiet environment with minimal distractions.",
  "Respond with the first word that comes to mind — don't overthink it.",
  "Type your response and press Enter to continue.",
] as const;

export function ProtocolScreen({
  wordCount,
  practiceCount,
  source,
  onReady,
  children,
}: ProtocolScreenProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-3xl font-bold text-foreground">
        Word Association Task
      </h1>

      <div className="max-w-lg space-y-4">
        <p className="text-center text-muted-foreground">
          You'll start with{" "}
          <strong className="text-foreground">{practiceCount}</strong> warm-up
          words, then see{" "}
          <strong className="text-foreground">{wordCount}</strong> scored words.
          For each word, type the first association that comes to mind.
        </p>

        <ul className="space-y-2 rounded-md border border-border bg-muted/40 p-4">
          {INSTRUCTIONS.map((text, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <span className="shrink-0 text-muted-foreground">
                {i + 1}.
              </span>
              {text}
            </li>
          ))}
        </ul>

        <p className="text-center text-xs text-muted-foreground italic">
          This is not a diagnostic tool. Results are for personal reflection
          only.
        </p>

        <p className="text-center text-xs text-muted-foreground">
          Source: {source}
        </p>
      </div>

      {children}

      <button
        onClick={onReady}
        className="rounded-md bg-primary px-8 py-3 text-lg text-primary-foreground hover:opacity-90"
      >
        I'm ready
      </button>
    </div>
  );
}
