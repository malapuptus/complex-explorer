import { useState, type FormEvent } from "react";

interface Props {
  word: string;
  index: number;
  total: number;
  onSubmit: (response: string) => void;
}

export function TrialView({ word, index, total, onSubmit }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(value);
    setValue("");
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
      <p className="text-sm text-muted-foreground">
        {index + 1} / {total}
      </p>
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
