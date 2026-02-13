import { useState, useRef, useCallback, type FormEvent, type KeyboardEvent } from "react";

interface TrialMetrics {
  tFirstKeyMs: number | null;
  backspaceCount: number;
  editCount: number;
}

interface Props {
  word: string;
  index: number;
  total: number;
  isPractice?: boolean;
  practiceCount?: number;
  onSubmit: (response: string, metrics: TrialMetrics) => void;
}

export function TrialView({
  word,
  index,
  total,
  isPractice,
  practiceCount = 0,
  onSubmit,
}: Props) {
  const [value, setValue] = useState("");
  const tFirstKeyRef = useRef<number | null>(null);
  const backspaceRef = useRef(0);
  const editRef = useRef(0);
  const trialStartRef = useRef(performance.now());

  // Reset refs when word changes (new trial)
  const lastWordRef = useRef(word);
  if (lastWordRef.current !== word) {
    lastWordRef.current = word;
    tFirstKeyRef.current = null;
    backspaceRef.current = 0;
    editRef.current = 0;
    trialStartRef.current = performance.now();
  }

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") return;
    if (tFirstKeyRef.current === null) {
      tFirstKeyRef.current = performance.now() - trialStartRef.current;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      backspaceRef.current++;
    }
    editRef.current++;
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const metrics: TrialMetrics = {
      tFirstKeyMs: tFirstKeyRef.current,
      backspaceCount: backspaceRef.current,
      editCount: editRef.current,
    };
    onSubmit(value, metrics);
    setValue("");
    tFirstKeyRef.current = null;
    backspaceRef.current = 0;
    editRef.current = 0;
    trialStartRef.current = performance.now();
  };

  const displayIndex = isPractice
    ? `Practice ${index + 1} / ${practiceCount}`
    : `${index - practiceCount + 1} / ${total - practiceCount}`;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-1">
        {isPractice && (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Warm-up
          </span>
        )}
        <p className="text-sm text-muted-foreground">{displayIndex}</p>
      </div>
      <h2 className="text-5xl font-bold tracking-tight text-foreground">
        {word}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type the first word that comes to mind…"
          className="w-80 rounded-md border border-input bg-background px-4 py-2 text-center text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90"
        >
          Next
        </button>
      </form>
    </div>
  );
}
