/**
 * LocalStorageSessionStore — implements SessionStore using localStorage.
 * Infra layer adapter with schema versioning and migration.
 */

import type {
  SessionStore,
  SessionListEntry,
  SessionResult,
  AssociationResponse,
} from "@/domain";

const STORAGE_KEY = "complex-mapper-sessions";

/**
 * Current schema version. Bump when SessionResult shape changes.
 *  v1 — original (no tFirstKeyMs/backspaceCount/editCount on AssociationResponse)
 *  v2 — added tFirstKeyMs, backspaceCount, editCount, isPractice, high_editing flag
 */
const CURRENT_SCHEMA_VERSION = 2;

interface StorageEnvelope {
  schemaVersion: number;
  sessions: Record<string, SessionResult>;
}

// ── Migration ────────────────────────────────────────────────────────

/**
 * Migrate a v1 AssociationResponse (missing new fields) to v2.
 */
function migrateAssociationV1toV2(
  a: Record<string, unknown>,
): AssociationResponse {
  return {
    response: (a.response as string) ?? "",
    reactionTimeMs: (a.reactionTimeMs as number) ?? 0,
    tFirstKeyMs: (a.tFirstKeyMs as number | null) ?? null,
    backspaceCount: (a.backspaceCount as number) ?? 0,
    editCount: (a.editCount as number) ?? 0,
  };
}

function migrateSessionV1toV2(raw: Record<string, unknown>): SessionResult {
  const trials = ((raw.trials as Array<Record<string, unknown>>) ?? []).map(
    (t) => ({
      stimulus: t.stimulus as SessionResult["trials"][0]["stimulus"],
      association: migrateAssociationV1toV2(
        t.association as Record<string, unknown>,
      ),
      isPractice: (t.isPractice as boolean) ?? false,
    }),
  );

  return {
    id: raw.id as string,
    config: raw.config as SessionResult["config"],
    trials,
    startedAt: raw.startedAt as string,
    completedAt: raw.completedAt as string,
    scoring: raw.scoring as SessionResult["scoring"],
  };
}

function migrateSessions(
  sessions: Record<string, unknown>,
  fromVersion: number,
): Record<string, SessionResult> {
  if (fromVersion >= CURRENT_SCHEMA_VERSION) {
    return sessions as Record<string, SessionResult>;
  }

  const migrated: Record<string, SessionResult> = {};
  for (const [id, raw] of Object.entries(sessions)) {
    try {
      migrated[id] = migrateSessionV1toV2(raw as Record<string, unknown>);
    } catch {
      // Skip sessions that can't be migrated
    }
  }
  return migrated;
}

// ── Storage I/O ──────────────────────────────────────────────────────

function readEnvelope(): StorageEnvelope {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schemaVersion: CURRENT_SCHEMA_VERSION, sessions: {} };

    const parsed = JSON.parse(raw);

    // Legacy format: plain Record<string, SessionResult> without envelope
    if (!parsed.schemaVersion) {
      const migrated = migrateSessions(parsed, 1);
      const envelope: StorageEnvelope = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        sessions: migrated,
      };
      writeEnvelope(envelope);
      return envelope;
    }

    // Versioned envelope — migrate if needed
    if (parsed.schemaVersion < CURRENT_SCHEMA_VERSION) {
      const migrated = migrateSessions(
        parsed.sessions,
        parsed.schemaVersion,
      );
      const envelope: StorageEnvelope = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        sessions: migrated,
      };
      writeEnvelope(envelope);
      return envelope;
    }

    return parsed as StorageEnvelope;
  } catch {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, sessions: {} };
  }
}

function writeEnvelope(envelope: StorageEnvelope): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

// ── Store implementation ─────────────────────────────────────────────

export const localStorageSessionStore: SessionStore = {
  async save(session: SessionResult): Promise<void> {
    const envelope = readEnvelope();
    envelope.sessions[session.id] = session;
    writeEnvelope(envelope);
  },

  async load(id: string): Promise<SessionResult | undefined> {
    const envelope = readEnvelope();
    return envelope.sessions[id];
  },

  async list(): Promise<SessionListEntry[]> {
    const envelope = readEnvelope();
    return Object.values(envelope.sessions)
      .map((s) => ({
        id: s.id,
        completedAt: s.completedAt,
        totalTrials: s.trials.filter((t) => !t.isPractice).length,
        stimulusListId: s.config.stimulusListId,
      }))
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  },

  async delete(id: string): Promise<void> {
    const envelope = readEnvelope();
    delete envelope.sessions[id];
    writeEnvelope(envelope);
  },

  async deleteAll(): Promise<void> {
    writeEnvelope({ schemaVersion: CURRENT_SCHEMA_VERSION, sessions: {} });
  },

  async exportAll(): Promise<string> {
    const envelope = readEnvelope();
    return JSON.stringify(envelope, null, 2);
  },
};
