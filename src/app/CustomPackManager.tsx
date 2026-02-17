/**
 * CustomPackManager — lists and deletes user-imported stimulus packs.
 * Ticket 0200.
 */

import { localStorageStimulusStore } from "@/infra";
import type { CustomPackEntry } from "@/infra";

interface Props {
  packs: CustomPackEntry[];
  onChanged: () => void;
}

export function CustomPackManager({ packs, onChanged }: Props) {
  if (packs.length === 0) return null;

  const handleDelete = (id: string, version: string) => {
    localStorageStimulusStore.delete(id, version);
    onChanged();
  };

  return (
    <div className="w-full max-w-md space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground">
        Custom packs ({packs.length})
      </h4>
      <ul className="space-y-1">
        {packs.map((p) => (
          <li
            key={`${p.id}@${p.version}`}
            className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-xs"
          >
            <span className="text-foreground">
              {p.id}
              <span className="text-muted-foreground">@{p.version}</span>
              <span className="ml-2 text-muted-foreground">
                ({p.wordCount} words)
              </span>
            </span>
            <button
              onClick={() => handleDelete(p.id, p.version)}
              className="ml-3 text-destructive hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs italic text-muted-foreground">
        Deleting a pack does not remove past session data.
      </p>
    </div>
  );
}
