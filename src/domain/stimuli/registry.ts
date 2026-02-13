/**
 * Built-in stimulus lists registry.
 * Each list is versioned and attributable with provenance metadata.
 */

import type { StimulusList } from "./types";

// ── Demo pack ────────────────────────────────────────────────────────

const DEMO_LIST_V1: StimulusList = {
  id: "demo-10",
  version: "1.0.0",
  language: "en",
  source: "Project demo list (not clinically validated)",
  provenance: {
    sourceName: "Complex Mapper Project",
    sourceYear: "2025",
    sourceCitation:
      "Internal demo list — not derived from any clinical instrument.",
    licenseNote: "Project-internal; no license restrictions.",
  },
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

// ── Kent–Rosanoff 1910 ───────────────────────────────────────────────

/**
 * The Kent–Rosanoff Free Association Test (1910).
 * 100 common English stimulus words designed to elicit associations
 * without emotional loading. Public domain.
 *
 * Source: Kent, G. H., & Rosanoff, A. J. (1910). A study of
 * association in insanity. American Journal of Insanity, 67, 37–96.
 */
const KENT_ROSANOFF_1910_V1: StimulusList = {
  id: "kent-rosanoff-1910",
  version: "1.0.0",
  language: "en",
  source: "Kent & Rosanoff (1910)",
  provenance: {
    sourceName: "Grace Helen Kent & Aaron Joshua Rosanoff",
    sourceYear: "1910",
    sourceCitation:
      'Kent, G. H., & Rosanoff, A. J. (1910). "A study of association in insanity." American Journal of Insanity, 67, 37–96.',
    licenseNote: "Public domain (published 1910, US copyright expired).",
  },
  words: [
    "table",
    "dark",
    "music",
    "sickness",
    "man",
    "deep",
    "soft",
    "eating",
    "mountain",
    "house",
    "black",
    "mutton",
    "comfort",
    "hand",
    "short",
    "fruit",
    "butterfly",
    "smooth",
    "command",
    "chair",
    "sweet",
    "whistle",
    "woman",
    "cold",
    "slow",
    "wish",
    "river",
    "white",
    "beautiful",
    "window",
    "rough",
    "citizen",
    "foot",
    "spider",
    "needle",
    "red",
    "sleep",
    "anger",
    "carpet",
    "girl",
    "high",
    "working",
    "sour",
    "earth",
    "trouble",
    "soldier",
    "cabbage",
    "hard",
    "eagle",
    "stomach",
    "stem",
    "lamp",
    "dream",
    "yellow",
    "bread",
    "justice",
    "boy",
    "light",
    "health",
    "bible",
    "memory",
    "sheep",
    "bath",
    "cottage",
    "swift",
    "blue",
    "hungry",
    "priest",
    "ocean",
    "head",
    "stove",
    "long",
    "religion",
    "whiskey",
    "child",
    "bitter",
    "hammer",
    "thirsty",
    "city",
    "square",
    "butter",
    "doctor",
    "loud",
    "thief",
    "lion",
    "joy",
    "bed",
    "heavy",
    "tobacco",
    "baby",
    "moon",
    "scissors",
    "quiet",
    "green",
    "salt",
    "street",
    "king",
    "cheese",
    "blossom",
    "afraid",
  ],
};

// ── Registry ─────────────────────────────────────────────────────────

/** All known stimulus lists, keyed by `${id}@${version}`. */
const REGISTRY: ReadonlyMap<string, StimulusList> = new Map([
  [key(DEMO_LIST_V1), DEMO_LIST_V1],
  [key(KENT_ROSANOFF_1910_V1), KENT_ROSANOFF_1910_V1],
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
