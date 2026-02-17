import { describe, it, expect } from "vitest";
import { sessionTrialsToCsv } from "../csvExport";
import type { Trial, TrialFlag } from "../types";

function makeTrial(word: string, index: number): Trial {
  return {
    stimulus: { word, index },
    association: {
      response: "reply",
      reactionTimeMs: 500,
      tFirstKeyMs: 200,
      backspaceCount: 0,
      editCount: 1,
      compositionCount: 0,
    },
    isPractice: false,
  };
}

describe("sessionTrialsToCsv", () => {
  const trials: Trial[] = [makeTrial("tree", 0)];
  const flags: TrialFlag[] = [{ trialIndex: 0, flags: [] }];

  it("includes scoring_version in header", () => {
    const csv = sessionTrialsToCsv(
      trials,
      flags,
      "s1",
      "demo-10",
      "1.0.0",
      42,
      "abc123",
      "scoring_v2_mad_3.5",
    );
    const header = csv.split("\n")[0];
    expect(header).toContain("scoring_version");
  });

  it("includes scoring_version value in data row", () => {
    const csv = sessionTrialsToCsv(
      trials,
      flags,
      "s1",
      "demo-10",
      "1.0.0",
      42,
      "abc123",
      "scoring_v2_mad_3.5",
    );
    const row = csv.split("\n")[1];
    expect(row).toContain("scoring_v2_mad_3.5");
  });

  it("scoring_version is empty when not provided", () => {
    const csv = sessionTrialsToCsv(trials, flags, "s1", "demo-10", "1.0.0", 42);
    const row = csv.split("\n")[1];
    // session_id,fingerprint,scoring_version — third field should be empty
    const fields = row.split(",");
    expect(fields[2]).toBe("");
  });
});
