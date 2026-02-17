/**
 * CustomPackManager — lists and deletes user-imported stimulus packs.
 * Ticket 0200. Orphan cleanup added in Ticket 0222.
 */

import { useState } from "react";
import { localStorageStimulusStore, localStorageSessionStore } from "@/infra";
import type { CustomPackEntry } from "@/infra";

interface Props {
  packs: CustomPackEntry[];
  onChanged: () => void;
}

export function CustomPackManager({ packs, onChanged }: Props) {
  const [orphanResult, setOrphanResult] = useState<string | null>(null);

  if (packs.length === 0) return null;

  const handleDelete = (id: string, version: string) => {
    localStorageStimulusStore.delete(id, version);
    onChanged();
  };

  const handleDeleteOrphans = async () => {
    const refs = await localStorageSessionStore.referencedPacks();
    let deleted = 0;
    for (const p of packs) {
      const key = `${p.id}@${p.version}`;
      if (!refs.has(key)) {
        localStorageStimulusStore.delete(p.id, p.version);
        deleted++;
      }
    }
    setOrphanResult(
      deleted > 0
        ? `Deleted ${deleted} orphan pack(s).`
        : "No orphan packs found — all packs are referenced by sessions.",
    );
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
      <div className="flex items-center gap-3">
        <button
          onClick={handleDeleteOrphans}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          Delete orphan packs
        </button>
        {orphanResult && (
          <span className="text-xs text-muted-foreground">{orphanResult}</span>
        )}
      </div>
      <p className="text-xs italic text-muted-foreground">
        Deleting a pack does not remove past session data.
      </p>
    </div>
  );
}
