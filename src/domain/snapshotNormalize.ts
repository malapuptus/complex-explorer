/**
 * snapshotNormalize — ensures stimulusPackSnapshot is self-describing.
 * Ticket 0261: if words are present, hash + schema are always populated.
 * Pure domain helper — no I/O.
 */

import { computeWordsSha256 } from "./stimuli/integrity";
import { STIMULUS_SCHEMA_VERSION } from "./stimuli/types";
import type { StimulusPackSnapshot } from "./types";

/**
 * Given a snapshot and optional word list, return a copy with:
 *   - stimulusSchemaVersion = "sp_v1" (if words present)
 *   - stimulusListHash = sha256(words.join("\n")) (if words present)
 *
 * If words absent/empty, the snapshot is returned unchanged.
 */
export async function normalizeSnapshot(
  snapshot: StimulusPackSnapshot & { words?: readonly string[] },
  words?: readonly string[] | null,
): Promise<StimulusPackSnapshot & { words?: readonly string[] }> {
  const effectiveWords = words ?? snapshot.words;
  if (!effectiveWords || effectiveWords.length === 0) {
    return snapshot;
  }
  const hash = await computeWordsSha256(effectiveWords);
  return {
    ...snapshot,
    stimulusSchemaVersion: snapshot.stimulusSchemaVersion ?? STIMULUS_SCHEMA_VERSION,
    stimulusListHash: snapshot.stimulusListHash ?? hash,
    words: effectiveWords,
  };
}
