import { describe, it, expect } from "vitest";
import { computeSessionFingerprint } from "../fingerprint";
import type { SessionConfig } from "../types";

function makeConfig(overrides?: Partial<SessionConfig>): SessionConfig {
  return {
    stimulusListId: "demo-10",
    stimulusListVersion: "1.0.0",
    maxResponseTimeMs: 0,
    orderPolicy: "seeded",
    seed: 42,
    trialTimeoutMs: undefined,
    breakEveryN: undefined,
    ...overrides,
  };
}

const ORDER = ["tree", "house", "water"];

describe("computeSessionFingerprint", () => {
  it("returns a 64-char hex string", async () => {
    const fp = await computeSessionFingerprint({
      config: makeConfig(),
      stimulusOrder: ORDER,
      seedUsed: 42,
    });
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same inputs produce same fingerprint", async () => {
    const opts = {
      config: makeConfig(),
      stimulusOrder: ORDER,
      seedUsed: 42 as number | null,
    };
    const a = await computeSessionFingerprint(opts);
    const b = await computeSessionFingerprint(opts);
    expect(a).toBe(b);
  });

  it("different seed produces different fingerprint", async () => {
    const base = { config: makeConfig(), stimulusOrder: ORDER };
    const a = await computeSessionFingerprint({ ...base, seedUsed: 42 });
    const b = await computeSessionFingerprint({ ...base, seedUsed: 99 });
    expect(a).not.toBe(b);
  });

  it("different order produces different fingerprint", async () => {
    const base = { config: makeConfig(), seedUsed: 42 as number | null };
    const a = await computeSessionFingerprint({
      ...base,
      stimulusOrder: ["tree", "house", "water"],
    });
    const b = await computeSessionFingerprint({
      ...base,
      stimulusOrder: ["water", "house", "tree"],
    });
    expect(a).not.toBe(b);
  });

  it("different pack produces different fingerprint", async () => {
    const base = { stimulusOrder: ORDER, seedUsed: 42 as number | null };
    const a = await computeSessionFingerprint({
      ...base,
      config: makeConfig({ stimulusListId: "demo-10" }),
    });
    const b = await computeSessionFingerprint({
      ...base,
      config: makeConfig({ stimulusListId: "kent-rosanoff-1910" }),
    });
    expect(a).not.toBe(b);
  });

  it("different timeout produces different fingerprint", async () => {
    const base = { stimulusOrder: ORDER, seedUsed: 42 as number | null };
    const a = await computeSessionFingerprint({
      ...base,
      config: makeConfig({ trialTimeoutMs: undefined }),
    });
    const b = await computeSessionFingerprint({
      ...base,
      config: makeConfig({ trialTimeoutMs: 5000 }),
    });
    expect(a).not.toBe(b);
  });

  it("null seed is handled distinctly from numeric seed", async () => {
    const base = { config: makeConfig(), stimulusOrder: ORDER };
    const a = await computeSessionFingerprint({ ...base, seedUsed: null });
    const b = await computeSessionFingerprint({ ...base, seedUsed: 0 });
    expect(a).not.toBe(b);
  });
});
