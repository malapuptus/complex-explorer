/**
 * SessionStore — domain-facing interface for session persistence.
 * Defined in domain so app and infra can depend on it.
 */

import type { SessionResult } from "./types";

export interface SessionStore {
  /** Save a completed session. */
  save(session: SessionResult): Promise<void>;
  /** Load a session by ID. Returns undefined if not found. */
  load(id: string): Promise<SessionResult | undefined>;
  /** List all saved sessions (metadata only). */
  list(): Promise<SessionListEntry[]>;
  /** Delete a session by ID. */
  delete(id: string): Promise<void>;
  /** Delete all saved sessions. */
  deleteAll(): Promise<void>;
  /** Export all sessions as a JSON string. */
  exportAll(): Promise<string>;
}

export interface SessionListEntry {
  readonly id: string;
  readonly completedAt: string;
  readonly totalTrials: number;
  readonly stimulusListId: string;
}
