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
}

export interface SessionListEntry {
  readonly id: string;
  readonly completedAt: string;
  readonly totalTrials: number;
  readonly stimulusListId: string;
}
