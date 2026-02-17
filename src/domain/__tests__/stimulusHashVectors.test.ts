/**
 * Ticket 0208 — Canonical stimulus hash test vectors.
 * Locks SHA-256 canonicalization rules so hashes never drift.
 * Canonicalization: SHA-256(words.join("\n")), hex-encoded lowercase, no trailing newline.
 */

import { describe, it, expect } from "vitest";
import { computeWordsSha256 } from "../stimuli/integrity";

/**
 * Test vectors — each defines an input word list and expected SHA-256 hex digest.
 * Words are hashed as-is (case-preserved, whitespace-preserved in individual words).
 * Join separator is exactly "\n" (U+000A), no trailing newline.
 */
const VECTORS: Array<{ label: string; words: string[]; expectedHash: string }> = [
  {
    label: "simple 3-word list",
    words: ["alpha", "beta", "gamma"],
    expectedHash: "f3220283d05d1ff2ae350cfe9e0e367cb5aef46e10efb203c8a53c678e2218c8",
  },
  {
    label: "single word",
    words: ["hello"],
    expectedHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  },
  {
    label: "case differences are preserved (not normalized)",
    words: ["Alpha", "beta", "Gamma"],
    expectedHash: "a3b96c5448cb3c3ee81d8a55241f70d259cf4f02df8e5dcb9a09d245b4928f10",
  },
  {
    label: "words with leading/trailing whitespace are preserved",
    words: [" alpha", "beta ", " gamma "],
    expectedHash: "55f4c645313191efe607344a62c30327eca4a486bf0b9ae55cf9daab7ef5fd3d",
  },
  {
    label: "non-ASCII / Unicode words (stable UTF-8)",
    words: ["café", "naïve", "über", "日本語"],
    expectedHash: "4984688c9201cc352d2384d17e75cf0e5144aae7bfcb3da6afa3b01462dd7d70",
  },
  {
    label: "empty-string word (edge case for hash stability)",
    words: ["", "a", ""],
    expectedHash: "6dba9d80d5c3ac293f1947c1457ea897869ebb556045095ffb3f06b14da2f7f0",
  },
];

describe("Stimulus hash canonical vectors", () => {
  for (const vec of VECTORS) {
    it(`vector: ${vec.label}`, async () => {
      const hash = await computeWordsSha256(vec.words);
      expect(hash).toBe(vec.expectedHash);
    });
  }

  it("case differences produce different hashes", async () => {
    const lower = await computeWordsSha256(["alpha", "beta", "gamma"]);
    const mixed = await computeWordsSha256(["Alpha", "beta", "Gamma"]);
    expect(lower).not.toBe(mixed);
  });

  it("whitespace differences produce different hashes", async () => {
    const clean = await computeWordsSha256(["alpha", "beta"]);
    const padded = await computeWordsSha256([" alpha", "beta "]);
    expect(clean).not.toBe(padded);
  });

  it("order matters", async () => {
    const h1 = await computeWordsSha256(["alpha", "beta"]);
    const h2 = await computeWordsSha256(["beta", "alpha"]);
    expect(h1).not.toBe(h2);
  });

  it("all hashes are 64-char lowercase hex", async () => {
    for (const vec of VECTORS) {
      const hash = await computeWordsSha256(vec.words);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
