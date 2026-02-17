/**
 * Storage report helpers — pure data extraction for quota debugging.
 * Ticket 0262.
 */

declare const __APP_VERSION__: string;
function appVersion(): string | null {
  try { return typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null; } catch { return null; }
}

/** A concise summary of storage usage for debugging/quota management. */
export interface StorageReport {
  generatedAt: string;
  appVersion: string | null;
  sessions: {
    totalCount: number;
    approximateKB: number;
    largest10: Array<{ id: string; bytes: number; imported: boolean }>;
  };
  packs: {
    totalCount: number;
    approximateKB: number;
    largest10: Array<{ id: string; version: string; bytes: number }>;
  };
}

const SESSION_KEY = "complex-mapper-sessions";
const PACK_KEY = "complex-mapper-custom-packs";

/** Build a StorageReport from localStorage. Safe to call from any layer. */
export function buildStorageReport(): StorageReport {
  const sessionRaw = localStorage.getItem(SESSION_KEY) ?? "{}";
  const packRaw = localStorage.getItem(PACK_KEY) ?? "{}";

  const sessionKB = Math.round(new Blob([sessionRaw]).size / 1024 * 10) / 10;
  const packKB = Math.round(new Blob([packRaw]).size / 1024 * 10) / 10;

  // Parse sessions for per-session byte estimates
  let sessions: Array<{ id: string; bytes: number; imported: boolean }> = [];
  try {
    const env = JSON.parse(sessionRaw) as Record<string, unknown>;
    const raw = ((env.sessions ?? env) as Record<string, unknown>);
    for (const [id, val] of Object.entries(raw)) {
      const bytes = new Blob([JSON.stringify(val)]).size;
      const imported = !!(val && typeof val === "object" && ("_imported" in (val as object) ? (val as Record<string, unknown>)._imported : false));
      sessions.push({ id, bytes, imported });
    }
  } catch { /* ignore */ }
  sessions.sort((a, b) => b.bytes - a.bytes);

  // Parse packs
  let packs: Array<{ id: string; version: string; bytes: number }> = [];
  try {
    const env = JSON.parse(packRaw) as { packs?: Record<string, unknown> };
    for (const [key, val] of Object.entries(env.packs ?? {})) {
      const bytes = new Blob([JSON.stringify(val)]).size;
      const [id, version = ""] = key.split("@");
      packs.push({ id, version, bytes });
    }
  } catch { /* ignore */ }
  packs.sort((a, b) => b.bytes - a.bytes);

  return {
    generatedAt: new Date().toISOString(),
    appVersion: appVersion(),
    sessions: {
      totalCount: sessions.length,
      approximateKB: sessionKB,
      largest10: sessions.slice(0, 10),
    },
    packs: {
      totalCount: packs.length,
      approximateKB: packKB,
      largest10: packs.slice(0, 10),
    },
  };
}
