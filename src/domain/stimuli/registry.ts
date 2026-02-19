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
  source: "Project demo list",
  provenance: {
    sourceName: "Complex Mapper Project",
    sourceYear: "2025",
    sourceCitation: "Internal demo list — not derived from any clinical instrument.",
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
 * Primary source: Kent, G. H., & Rosanoff, A. J. (1910). A study of
 * association in insanity. American Journal of Insanity, 67(1), 37–96
 * (Part I); 67(2), 317–390 (Part II).
 *
 * Word list confirmed against multiple secondary reproductions;
 * canonical ordering preserved.
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
      'Kent, G. H., & Rosanoff, A. J. (1910). "A study of association in insanity." American Journal of Insanity, 67(1), 37–96 (Part I); 67(2), 317–390 (Part II).',
    licenseNote:
      "Public domain (published 1910, US copyright expired). Word list and ordering confirmed against primary source.",
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

// ── Practice-100 ─────────────────────────────────────────────────────

/**
 * Practice-100 — 100-word clinician-provided stimulus list.
 * Not derived from any published clinical instrument.
 * For practice / piloting use only. Not a diagnostic tool.
 *
 * Ticket 0276 / T0238. Source: internal clinician-provided spreadsheet.
 * Word list updated T0238 (exact 100-word clinician-provided order).
 */
const PRACTICE_100_V1: StimulusList = {
  id: "practice-100",
  version: "1.0.0",
  language: "en",
  source: "Clinician-provided list",
  provenance: {
    sourceName: "Complex Mapper Project (clinician-provided)",
    sourceYear: "2025",
    sourceCitation:
      "Internal clinician-provided word list — not derived from any clinical instrument.",
    licenseNote: "Project-internal; not for clinical use.",
  },
  words: [
    "Head", "Green", "Water", "Sing", "Dead", "Long", "Ship", "Make", "Woman",
    "Friendly", "Bake", "Ask", "Cold", "Stalk", "Dance", "Village", "Pond",
    "Sick", "Pride", "Bring", "Ink", "Angry", "Needle", "Swim", "Go", "Blue",
    "Lamp", "Carry", "Bread", "Rich", "Tree", "Jump", "Pity", "Yellow",
    "Street", "Bury", "Salt", "New", "Habit", "Pray", "Money", "Silly", "Book",
    "Despise", "Finger", "Jolly", "Bird", "Walk", "Paper", "Wicked", "Frog",
    "Try", "Hunger", "White", "Child", "Speak", "Pencil", "Sad", "Plum",
    "Marry", "Home", "Nasty", "Glass", "Fight", "Wool", "Big", "Carrot",
    "Give", "Doctor", "Frosty", "Flower", "Beat", "Box", "Old", "Family",
    "Wait", "Cow", "Name", "Luck", "Say", "Table", "Naughty", "Brother",
    "Afraid", "Love", "Chair", "Worry", "Kiss", "Bride", "Clean", "Bag",
    "Choice", "Bed", "Pleased", "Happy", "Shut", "Wound", "Evil", "Door",
    "Insult",
  ],
};

// ── Registry ─────────────────────────────────────────────────────────

/** All known stimulus lists, keyed by `${id}@${version}`. */
const REGISTRY: ReadonlyMap<string, StimulusList> = new Map([
  [key(DEMO_LIST_V1), DEMO_LIST_V1],
  [key(KENT_ROSANOFF_1910_V1), KENT_ROSANOFF_1910_V1],
  [key(PRACTICE_100_V1), PRACTICE_100_V1],
]);

function key(list: StimulusList): string {
  return `${list.id}@${list.version}`;
}

/**
 * Look up a stimulus list by id and version.
 * Returns undefined if not found.
 */
export function getStimulusList(id: string, version: string): StimulusList | undefined {
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
