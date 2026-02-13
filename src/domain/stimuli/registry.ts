/**
 * Built-in stimulus lists registry.
 * Each list is versioned and attributable.
 */

import type { StimulusList } from "./types";

const DEMO_LIST_V1: StimulusList = {
  id: "demo-10",
  version: "1.0.0",
  language: "en",
  source: "Project demo list (not clinically validated)",
  words: [
    "tree",
    "house",
    "water",
    "mother",
    "dark",
    "journey",
    "bridge",
    "child",
    "fire",
    "silence",
  ],
};

/** All known stimulus lists, keyed by `${id}@${version}`. */
const REGISTRY: ReadonlyMap<string, StimulusList> = new Map([
  [key(DEMO_LIST_V1), DEMO_LIST_V1],
]);

function key(list: StimulusList): string {
  return `${list.id}@${list.version}`;
}

/**
 * Look up a stimulus list by id and version.
 * Returns undefined if not found.
 */
export function getStimulusList(
  id: string,
  version: string,
): StimulusList | undefined {
  return REGISTRY.get(`${id}@${version}`);
}

/** Return all available list metadata (without full word arrays). */
export function listAvailableStimulusLists(): ReadonlyArray<{
  id: string;
  version: string;
  language: string;
  source: string;
  wordCount: number;
}> {
  return Array.from(REGISTRY.values()).map((l) => ({
    id: l.id,
    version: l.version,
    language: l.language,
    source: l.source,
    wordCount: l.words.length,
  }));
}
