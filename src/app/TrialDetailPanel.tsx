/**
 * TrialDetailPanel — dialog showing full details for a single trial.
 * Ticket 0266.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { TrialRef, FlagKind } from "@/domain";

interface Props {
  trialRef: TrialRef | null;
  onClose: () => void;
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

export function TrialDetailPanel({ trialRef, onClose }: Props) {
  return (
    <Dialog open={trialRef !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
