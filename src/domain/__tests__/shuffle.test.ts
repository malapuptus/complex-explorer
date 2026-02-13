import { describe, it, expect } from "vitest";
import { seededShuffle } from "../shuffle";

describe("seededShuffle", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

  it("is deterministic — same seed produces same order", () => {
    const r1 = seededShuffle(items, 42);
    const r2 = seededShuffle(items, 42);
    expect(r1).toEqual(r2);
  });

  it("different seeds produce different orders", () => {
    const r1 = seededShuffle(items, 42);
    const r2 = seededShuffle(items, 999);
    expect(r1).not.toEqual(r2);
  });

  it("does not mutate the input array", () => {
    const original = [...items];
    seededShuffle(items, 42);
    expect(items).toEqual(original);
  });

  it("preserves all elements (no loss or duplication)", () => {
    const result = seededShuffle(items, 42);
    expect(result.sort()).toEqual([...items].sort());
  });

  it("returns empty array for empty input", () => {
    expect(seededShuffle([], 42)).toEqual([]);
  });

  it("returns single element for single-element input", () => {
    expect(seededShuffle(["x"], 42)).toEqual(["x"]);
  });

  it("produces a permutation (not original order) for large enough input", () => {
    // With 10 items, the chance of randomly getting the exact same order is 1/10!
    const result = seededShuffle(items, 42);
    expect(result).not.toEqual(items);
  });

  it("is stable across multiple calls with same seed and different data sizes", () => {
    const small = seededShuffle(["a", "b", "c"], 123);
    const small2 = seededShuffle(["a", "b", "c"], 123);
    expect(small).toEqual(small2);
  });
});
