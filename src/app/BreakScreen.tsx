/**
 * BreakScreen — shown every N scored trials to reduce fatigue.
 * Break time does NOT affect trial timing.
 */

interface Props {
  completedScored: number;
  totalScored: number;
  onContinue: () => void;
}

export function BreakScreen({ completedScored, totalScored, onContinue }: Props) {
  const remaining = totalScored - completedScored;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <h2 className="text-2xl font-bold text-foreground">Take a Break</h2>
      <p className="max-w-sm text-center text-muted-foreground">
        You've completed <strong className="text-foreground">{completedScored}</strong> of{" "}
        <strong className="text-foreground">{totalScored}</strong> words. {remaining} remaining.
      </p>
      <p className="text-sm text-muted-foreground">
        Take a moment to rest. Press continue when you're ready.
      </p>
      <button
        autoFocus
        onClick={onContinue}
        className="rounded-md bg-primary px-8 py-3 text-lg text-primary-foreground hover:opacity-90"
      >
        Continue
      </button>
    </div>
  );
}
