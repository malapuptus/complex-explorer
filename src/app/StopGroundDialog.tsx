/**
 * StopGroundDialog — T0248: safety escape hatch with grounding prompts.
 * Visible on RunningTrial, BreakScreen, ResultsView.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onEnd: () => void;
  /** Show timing-quality warning (Research mode). */
  showTimingWarning?: boolean;
}

export function StopGroundDialog({ open, onOpenChange, onResume, onEnd, showTimingWarning }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Take a moment</DialogTitle>
          <DialogDescription>
            You can pause or end the session anytime. There's no pressure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Grounding exercise</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Take a slow, deep breath in through your nose… and out through your mouth.</li>
              <li>Look around and name 3 things you can see right now.</li>
            </ol>
          </div>

          {showTimingWarning && (
            <p className="text-xs text-muted-foreground italic">
              Note: In Research mode, pausing or interruptions may reduce timing consistency.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { onResume(); onOpenChange(false); }}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Resume
            </button>
            <button
              onClick={() => { onEnd(); onOpenChange(false); }}
              className="flex-1 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              End &amp; Return Home
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
