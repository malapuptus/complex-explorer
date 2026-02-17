/**
 * SessionStore — domain-facing interface for session persistence.
 * Defined in domain so app and infra can depend on it.
 */

import type { SessionResult, Trial, OrderPolicy } from "./types";

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

  /** Save a draft (in-progress session). Only one draft at a time. */
  saveDraft(draft: DraftSession): Promise<void>;
  /** Load the current draft (if any). */
  loadDraft(): Promise<DraftSession | null>;
  /** Delete the current draft. */
  deleteDraft(): Promise<void>;

  /**
   * Attempt to acquire the draft lock for this tab.
   * Returns true if lock was acquired (or stolen after TTL expiry).
   */
  acquireDraftLock(tabId: string): boolean;
  /** Release the draft lock if held by this tabId. */
  releaseDraftLock(tabId: string): void;
  /** Check whether the lock is held by a different tab (TTL not expired). */
  isDraftLockedByOther(tabId: string): boolean;

  /** Approximate bytes used by sessions in storage. */
  estimateBytes(): number;

  /** Return all pack references (id@version) used by saved sessions. */
  referencedPacks(): Promise<Set<string>>;
}

export interface SessionListEntry {
  readonly id: string;
  readonly completedAt: string;
  readonly totalTrials: number;
  readonly stimulusListId: string;
}

/** A serializable snapshot of an in-progress session. */
export interface DraftSession {
  readonly id: string;
  readonly stimulusListId: string;
  readonly stimulusListVersion: string;
  readonly orderPolicy: OrderPolicy;
  readonly seedUsed: number | null;
  readonly wordList: readonly string[];
  readonly practiceWords: readonly string[];
  /** The realized stimulus order (post-shuffle). */
  readonly stimulusOrder: readonly string[];
  readonly trials: readonly Trial[];
  readonly currentIndex: number;
  readonly savedAt: string;
  /** ISO-8601 timestamp of when the session was first started. */
  readonly startedAt?: string;
  /** Per-trial timeout in ms (undefined = no timeout). */
  readonly trialTimeoutMs?: number;
  /** Break interval in scored trials (undefined = no breaks). */
  readonly breakEveryN?: number;
}

/** Draft lock record persisted in storage. */
export interface DraftLock {
  readonly tabId: string;
  readonly acquiredAtMs: number;
}

/** Lock TTL in milliseconds (2 minutes). */
export const DRAFT_LOCK_TTL_MS = 2 * 60 * 1000;
