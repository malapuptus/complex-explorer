/**
 * simulateSession — pure deterministic session generator for dev/testing.
 * No pack store dependency. Uses mulberry32 PRNG.
 * Ticket 0268.
 */

import { scoreSession } from "./scoring";
import type { SessionResult, Trial, StimulusWord } from "./types";

const SCORING_VERSION_SIM = "scoring_v2_mad_3.5";

// ── Mulberry32 PRNG (local copy — pure domain isolation) ─────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_WORDS = [
  "apple", "river", "storm", "clock", "bridge",
  "forest", "mirror", "flame", "ocean", "shadow",
];

const DEFAULT_TIMEOUT_MS = 3000;

/**
 * Generate a deterministic simulated SessionResult.
 * Same seed → same output always.
 *
 * @param seed - Any integer (use Date.now() for "random" dev sessions)
 * @param wordCount - Number of trials (default 10, max DEMO_WORDS.length)
 */
export function simulateSession(seed: number, wordCount = 10): SessionResult {
  const rng = mulberry32(seed);
  const count = Math.min(wordCount, DEMO_WORDS.length);
  const words = DEMO_WORDS.slice(0, count);

  const trials: Trial[] = words.map((word, i) => {
    const stimulus: StimulusWord = { word, index: i };
    const isTimeout = rng() < 0.05;
    const isEmpty = !isTimeout && rng() < 0.05;
    const useIME = i === 1 || i === 4; // deterministic IME on positions 1 and 4

    const rt = isTimeout
      ? DEFAULT_TIMEOUT_MS
      : Math.max(80, Math.round(350 + rng() * 300 + rng() * 200 - 100));

    return {
      stimulus,
      association: {
        response: isEmpty ? "" : word,
        reactionTimeMs: rt,
        tFirstKeyMs: isEmpty || isTimeout ? null : Math.round(rt * 0.4 + rng() * 50),
        backspaceCount: Math.round(rng() * 2),
        editCount: Math.round(1 + rng() * 2),
        compositionCount: useIME ? 1 : 0,
      },
      isPractice: false,
      timedOut: isTimeout || undefined,
    };
  });

  const scoring = scoreSession(trials);

  // deterministic timestamps from seed
  const baseMs = 1700000000000 + (seed % 1000000) * 1000;
  const startedAt = new Date(baseMs).toISOString();
  const completedAt = new Date(baseMs + count * 4000).toISOString();

  return {
    id: `sim_${seed}`,
    config: {
      stimulusListId: "simulated",
      stimulusListVersion: "1.0.0",
      maxResponseTimeMs: 0,
      orderPolicy: "fixed",
      seed: null,
      trialTimeoutMs: DEFAULT_TIMEOUT_MS,
    },
    trials,
    startedAt,
    completedAt,
    seedUsed: seed,
    stimulusOrder: words,
    provenanceSnapshot: {
      listId: "simulated",
      listVersion: "1.0.0",
      language: "en",
      source: "Simulated session — not clinically validated",
      sourceName: "Complex Mapper Simulator",
      sourceYear: "2026",
      sourceCitation: "Internal simulation — not derived from any clinical instrument.",
      licenseNote: "internal/sim",
      wordCount: count,
    },
    sessionFingerprint: `sim_fp_${seed}`,
    scoringVersion: SCORING_VERSION_SIM,
    appVersion: "simulated",
    stimulusPackSnapshot: {
      stimulusListHash: null,
      stimulusSchemaVersion: null,
      provenance: null,
    },
    importedFrom: null,
    sessionContext: {
      deviceClass: "desktop",
      osFamily: "unknown",
      browserFamily: "unknown",
      locale: null,
      timeZone: null,
      inputHints: null,
    },
    scoring,
  };
}
