/**
 * ResumePrompt — UI shown when an unfinished draft session is detected on load.
 */

import type { DraftSession } from "@/domain";

interface Props {
  pendingDraft: DraftSession;
  draftLocked: boolean;
  onResume: () => void;
  onDiscard: () => void;
}

export function ResumePrompt({ pendingDraft, draftLocked, onResume, onDiscard }: Props) {
  const scoredDone = pendingDraft.trials.filter((t) => !t.isPractice).length;
  const savedDate = new Date(pendingDraft.savedAt);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <h2 className="text-2xl font-bold text-foreground">Resume Session?</h2>
      <div className="max-w-md space-y-2 text-center">
        <p className="text-muted-foreground">
          You have an unfinished session from{" "}
          <strong className="text-foreground">{savedDate.toLocaleString()}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Pack: {pendingDraft.stimulusListId} · {scoredDone} words completed
          {pendingDraft.seedUsed !== null && <> · Seed: {pendingDraft.seedUsed}</>}
        </p>
      </div>
      {draftLocked && (
        <p className="max-w-md text-center text-sm text-destructive">
          A session is active in another tab. Close it or wait 2 minutes.
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={onResume}
          className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90"
        >
          Resume
        </button>
        <button
          onClick={onDiscard}
          className="rounded-md border border-border px-6 py-2 text-foreground hover:bg-muted"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
