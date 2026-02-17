/**
 * localStorageStimulusStore — persists custom stimulus packs.
 * Infra layer adapter for user-imported packs.
 */

import type { StimulusList } from "@/domain/stimuli/types";
import { STIMULUS_SCHEMA_VERSION } from "@/domain/stimuli/types";

const STORAGE_KEY = "complex-mapper-custom-packs";

interface PackEnvelope {
  packs: Record<string, StimulusList & { importedAt: string }>;
}

function readEnvelope(): PackEnvelope {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { packs: {} };
    return JSON.parse(raw) as PackEnvelope;
  } catch {
    return { packs: {} };
  }
}

function writeEnvelope(envelope: PackEnvelope): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

function packKey(id: string, version: string): string {
  return `${id}@${version}`;
}

export interface CustomPackEntry {
  id: string;
  version: string;
  language: string;
  source: string;
  wordCount: number;
  importedAt: string;
}

export const localStorageStimulusStore = {
  save(list: StimulusList): void {
    const envelope = readEnvelope();
    const enriched = {
      ...list,
      stimulusSchemaVersion: list.stimulusSchemaVersion ?? STIMULUS_SCHEMA_VERSION,
      importedAt: new Date().toISOString(),
    };
    envelope.packs[packKey(list.id, list.version)] = enriched;
    writeEnvelope(envelope);
  },

  /** Returns true if a pack with the same (id, version) already exists. */
  exists(id: string, version: string): boolean {
    const envelope = readEnvelope();
    return packKey(id, version) in envelope.packs;
  },

  load(id: string, version: string): StimulusList | undefined {
    const envelope = readEnvelope();
    return envelope.packs[packKey(id, version)];
  },

  list(): CustomPackEntry[] {
    const envelope = readEnvelope();
    return Object.values(envelope.packs).map((p) => ({
      id: p.id,
      version: p.version,
      language: p.language,
      source: p.source,
      wordCount: p.words.length,
      importedAt: p.importedAt,
    }));
  },

  delete(id: string, version: string): void {
    const envelope = readEnvelope();
    delete envelope.packs[packKey(id, version)];
    writeEnvelope(envelope);
  },

  deleteAll(): void {
    writeEnvelope({ packs: {} });
  },
};
