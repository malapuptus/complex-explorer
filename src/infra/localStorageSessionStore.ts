/**
 * LocalStorageSessionStore — implements SessionStore using localStorage.
 * Infra layer adapter with schema versioning and migration.
 */

import type {
  SessionStore,
  SessionListEntry,
  SessionResult,
  AssociationResponse,
  DraftSession,
} from "@/domain";

const STORAGE_KEY = "complex-mapper-sessions";
const DRAFT_KEY = "complex-mapper-draft";

/**
 * Current schema version. Bump when SessionResult shape changes.
 *  v1 — original (no tFirstKeyMs/backspaceCount/editCount)
 *  v2 — added timing metrics, isPractice, orderPolicy, seed, stimulusOrder
 *  v3 — added provenanceSnapshot for reproducibility
 */
const CURRENT_SCHEMA_VERSION = 3;

interface StorageEnvelope {
  schemaVersion: number;
  sessions: Record<string, SessionResult>;
}

// ── Migration helpers ────────────────────────────────────────────────

function migrateAssociationV1toV3(
  a: Record<string, unknown>,
): AssociationResponse {
  return {
    response: (a.response as string) ?? "",
    reactionTimeMs: (a.reactionTimeMs as number) ?? 0,
    tFirstKeyMs: (a.tFirstKeyMs as number | null) ?? null,
    backspaceCount: (a.backspaceCount as number) ?? 0,
    editCount: (a.editCount as number) ?? 0,
    compositionCount: (a.compositionCount as number) ?? 0,
  };
}

/**
 * Migrate any raw session object to v3 (current).
 */
function migrateSessionToV3(raw: Record<string, unknown>): SessionResult {
  const trials = ((raw.trials as Array<Record<string, unknown>>) ?? []).map(
    (t) => ({
      stimulus: t.stimulus as SessionResult["trials"][0]["stimulus"],
      association: migrateAssociationV1toV3(
        t.association as Record<string, unknown>,
      ),
      isPractice: (t.isPractice as boolean) ?? false,
    }),
  );

  const config = (raw.config as Record<string, unknown>) ?? {};

  return {
    id: raw.id as string,
    config: {
      stimulusListId: (config.stimulusListId as string) ?? "",
      stimulusListVersion: (config.stimulusListVersion as string) ?? "",
      maxResponseTimeMs: (config.maxResponseTimeMs as number) ?? 0,
      orderPolicy: ((config.orderPolicy as string) ?? "fixed") as
        | "fixed"
        | "seeded",
      seed: (config.seed as number) ?? null,
    },
    trials,
    startedAt: raw.startedAt as string,
    completedAt: raw.completedAt as string,
    scoring: raw.scoring as SessionResult["scoring"],
    seedUsed: (raw.seedUsed as number) ?? null,
    stimulusOrder:
      (raw.stimulusOrder as string[]) ??
      trials.filter((t) => !t.isPractice).map((t) => t.stimulus.word),
    provenanceSnapshot:
      (raw.provenanceSnapshot as SessionResult["provenanceSnapshot"]) ?? null,
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
      migrated[id] = migrateSessionToV3(raw as Record<string, unknown>);
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

    // Legacy format: plain Record without envelope wrapper
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

// ── Draft I/O ────────────────────────────────────────────────────────

function readDraft(): DraftSession | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftSession;
  } catch {
    return null;
  }
}

function writeDraft(draft: DraftSession): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function removeDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
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

  async saveDraft(draft: DraftSession): Promise<void> {
    writeDraft(draft);
  },

  async loadDraft(): Promise<DraftSession | null> {
    return readDraft();
  },

  async deleteDraft(): Promise<void> {
    removeDraft();
  },
};
