/**
 * LocalStorageSessionStore — implements SessionStore using localStorage.
 * Infra layer adapter.
 */

import type { SessionStore, SessionListEntry, SessionResult } from "@/domain";

const STORAGE_KEY = "complex-mapper-sessions";

function readAll(): Record<string, SessionResult> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, SessionResult>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const localStorageSessionStore: SessionStore = {
  async save(session: SessionResult): Promise<void> {
    const all = readAll();
    all[session.id] = session;
    writeAll(all);
  },

  async load(id: string): Promise<SessionResult | undefined> {
    const all = readAll();
    return all[id];
  },

  async list(): Promise<SessionListEntry[]> {
    const all = readAll();
    return Object.values(all)
      .map((s) => ({
        id: s.id,
        completedAt: s.completedAt,
        totalTrials: s.trials.length,
        stimulusListId: s.config.stimulusListId,
      }))
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  },

  async delete(id: string): Promise<void> {
    const all = readAll();
    delete all[id];
    writeAll(all);
  },
};
