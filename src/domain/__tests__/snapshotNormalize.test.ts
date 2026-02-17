import { describe, it, expect } from "vitest";
import { normalizeSnapshot } from "@/domain/snapshotNormalize";
import { computeWordsSha256 } from "@/domain/stimuli/integrity";

/**
 * Ticket 0261 — snapshot completeness invariant.
 * words present ⇒ hash + schema must be populated.
 */

const WORDS = ["sun", "moon", "star"];

describe("normalizeSnapshot — words present", () => {
  it("sets stimulusSchemaVersion when absent", async () => {
    const snap = { stimulusListHash: null, stimulusSchemaVersion: null, provenance: null };
    const result = await normalizeSnapshot(snap, WORDS);
    expect(result.stimulusSchemaVersion).toBe("sp_v1");
  });

  it("sets stimulusListHash when absent", async () => {
    const snap = { stimulusListHash: null, stimulusSchemaVersion: null, provenance: null };
    const result = await normalizeSnapshot(snap, WORDS);
    const expected = await computeWordsSha256(WORDS);
    expect(result.stimulusListHash).toBe(expected);
  });

  it("does not overwrite an existing hash", async () => {
    const snap = { stimulusListHash: "existinghash", stimulusSchemaVersion: "sp_v1", provenance: null };
    const result = await normalizeSnapshot(snap, WORDS);
    expect(result.stimulusListHash).toBe("existinghash");
  });

  it("does not overwrite an existing schema version", async () => {
    const snap = { stimulusListHash: null, stimulusSchemaVersion: "sp_v2", provenance: null };
    const result = await normalizeSnapshot(snap, WORDS);
    expect(result.stimulusSchemaVersion).toBe("sp_v2");
  });

  it("attaches words to the result", async () => {
    const snap = { stimulusListHash: null, stimulusSchemaVersion: null, provenance: null };
    const result = await normalizeSnapshot(snap, WORDS);
    expect(result.words).toEqual(WORDS);
  });
});

describe("normalizeSnapshot — words absent or empty", () => {
  it("returns snapshot unchanged when words is undefined", async () => {
    const snap = { stimulusListHash: null, stimulusSchemaVersion: null, provenance: null };
    const result = await normalizeSnapshot(snap, undefined);
    expect(result.stimulusListHash).toBeNull();
    expect(result.stimulusSchemaVersion).toBeNull();
  });

  it("returns snapshot unchanged when words is empty array", async () => {
    const snap = { stimulusListHash: null, stimulusSchemaVersion: null, provenance: null };
    const result = await normalizeSnapshot(snap, []);
    expect(result.stimulusListHash).toBeNull();
  });

  it("returns snapshot unchanged when words on snapshot is empty", async () => {
    const snap = { stimulusListHash: null, stimulusSchemaVersion: null, provenance: null, words: [] };
    const result = await normalizeSnapshot(snap);
    expect(result.stimulusListHash).toBeNull();
  });
});

describe("normalizeSnapshot — round-trip hash consistency", () => {
  it("hash matches computeWordsSha256 for same words", async () => {
    const snap = { stimulusListHash: null, stimulusSchemaVersion: null, provenance: null };
    const result = await normalizeSnapshot(snap, WORDS);
    const direct = await computeWordsSha256(WORDS);
    expect(result.stimulusListHash).toBe(direct);
  });
});
