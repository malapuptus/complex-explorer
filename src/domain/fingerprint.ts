/**
 * Session fingerprint — deterministic hash of session config + order.
 * Pure domain — uses SubtleCrypto (available in browsers + Node 18+).
 */

import type { SessionConfig } from "./types";

/**
 * Compute a deterministic SHA-256 fingerprint for a session.
 * Inputs: pack id/version, realized stimulus order, seedUsed, and
 * key config fields (orderPolicy, trialTimeoutMs, breakEveryN).
 *
 * Same inputs always produce the same hex digest.
 */
export async function computeSessionFingerprint(opts: {
  readonly config: SessionConfig;
  readonly stimulusOrder: readonly string[];
  readonly seedUsed: number | null;
}): Promise<string> {
  const canonical = [
    `pack:${opts.config.stimulusListId}@${opts.config.stimulusListVersion}`,
    `order:${opts.config.orderPolicy}`,
    `seed:${opts.seedUsed ?? "null"}`,
    `timeout:${opts.config.trialTimeoutMs ?? "none"}`,
    `break:${opts.config.breakEveryN ?? "none"}`,
    `words:${opts.stimulusOrder.join(",")}`,
  ].join("\n");

  const payload = new TextEncoder().encode(canonical);
  const buf = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
