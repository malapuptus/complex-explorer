/**
 * Ticket 0220 — Round-trip invariant: bundle → import → hash equality.
 * Guarantees no silent canonicalization drift.
 */

import { describe, it, expect } from "vitest";
import { computeWordsSha256 } from "@/domain";

describe("Bundle round-trip hash invariant", () => {
  it("imported pack from bundle produces identical hash", async () => {
    const words = ["café", "naïve", "über", "日本語", "hello world"];
    const originalHash = await computeWordsSha256(words);

    // Simulate bundle export
    const bundle = {
      exportSchemaVersion: "rb_v3",
      stimulusPackSnapshot: {
        stimulusListHash: originalHash,
        stimulusSchemaVersion: "sp_v1",
        provenance: {
          listId: "test-unicode", listVersion: "1.0.0", language: "multi",
          source: "test", sourceName: "Test", sourceYear: "2026",
          sourceCitation: "n/a", licenseNote: "n/a", wordCount: words.length,
        },
        words,
      },
    };

    // Simulate bundle import: extract words, recompute hash
    const bundleJson = JSON.stringify(bundle);
    const parsed = JSON.parse(bundleJson);
    const extractedWords = parsed.stimulusPackSnapshot.words as string[];
    const reimportedHash = await computeWordsSha256(extractedWords);

    expect(reimportedHash).toBe(originalHash);
    expect(reimportedHash).toBe(parsed.stimulusPackSnapshot.stimulusListHash);
  });

  it("whitespace-sensitive words round-trip correctly", async () => {
    const words = ["  leading", "trailing  ", " both ", "normal"];
    const hash = await computeWordsSha256(words);

    const bundle = JSON.stringify({ stimulusPackSnapshot: { words } });
    const parsed = JSON.parse(bundle);
    const reimportedHash = await computeWordsSha256(parsed.stimulusPackSnapshot.words);

    expect(reimportedHash).toBe(hash);
  });

  it("empty-string word in list round-trips", async () => {
    // Edge case: blank words should fail validation but hash must still be stable
    const words = ["alpha", "", "gamma"];
    const hash = await computeWordsSha256(words);

    const bundle = JSON.stringify({ stimulusPackSnapshot: { words } });
    const parsed = JSON.parse(bundle);
    const reimportedHash = await computeWordsSha256(parsed.stimulusPackSnapshot.words);

    expect(reimportedHash).toBe(hash);
  });
});
