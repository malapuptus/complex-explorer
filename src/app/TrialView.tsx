import { useState, type FormEvent } from "react";

interface Props {
  word: string;
  index: number;
  total: number;
  isPractice?: boolean;
  practiceCount?: number;
  onSubmit: (response: string) => void;
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(value);
    setValue("");
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
