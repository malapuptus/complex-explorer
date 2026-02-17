/**
 * Ticket 0260 — privacy.identifiersAnonymized contract tests.
 * Proves the flag is set correctly on build and after anonymize.
 */

import { describe, it, expect } from "vitest";
import { buildBundleObject, anonymizeBundle } from "@/app/ResultsExportActions";
import type { Trial, TrialFlag, SessionResult } from "@/domain/types";

function makeTrial(word: string, index: number): Trial {
  return {
    stimulus: { word, index },
    association: { response: "r", reactionTimeMs: 400, tFirstKeyMs: 100, backspaceCount: 0, editCount: 1, compositionCount: 0 },
    isPractice: false,
  };
}

const trials = [makeTrial("sun", 0)];
const flags: TrialFlag[] = [{ trialIndex: 0, flags: [] }];
const csvMeta = { sessionId: "s1", packId: "demo-10", packVersion: "1.0.0", seed: null as number | null, sessionFingerprint: "fp123", orderPolicy: "fixed" as const };
const session: SessionResult = {
  id: "s1",
  config: { stimulusListId: "demo-10", stimulusListVersion: "1.0.0", maxResponseTimeMs: 0, orderPolicy: "fixed", seed: null },
  trials,
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-01T00:01:00Z",
  scoring: { trialFlags: flags, summary: { totalTrials: 1, meanReactionTimeMs: 400, medianReactionTimeMs: 400, stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0, timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0 } },
  seedUsed: null, stimulusOrder: ["sun"], provenanceSnapshot: null,
  sessionFingerprint: "fp123", scoringVersion: "scoring_v2_mad_3.5", appVersion: "1.0.0", stimulusPackSnapshot: null,
};

describe("privacy.identifiersAnonymized", () => {
  it("is false when anonymize = false (default)", () => {
    const b = buildBundleObject("full", trials, flags, 400, 400, session, csvMeta, null, "2026-01-01T00:00:00Z");
    expect(b.privacy.identifiersAnonymized).toBe(false);
  });

  it("is true when anonymize = true", () => {
    const b = buildBundleObject("full", trials, flags, 400, 400, session, csvMeta, null, "", true);
    expect(b.privacy.identifiersAnonymized).toBe(true);
  });

  it("anonymizeBundle preserves identifiersAnonymized=true", () => {
    const b = buildBundleObject("full", trials, flags, 400, 400, session, csvMeta, null, "", true);
    const anon = anonymizeBundle(b);
    expect(anon.privacy.identifiersAnonymized).toBe(true);
  });

  it("anonymizeBundle preserves identifiersAnonymized=false if built without anonymize", () => {
    const b = buildBundleObject("full", trials, flags, 400, 400, session, csvMeta, null, "2026-01-01T00:00:00Z");
    const anon = anonymizeBundle(b);
    // anonymizeBundle does not override the flag — caller is responsible
    expect(anon.privacy.identifiersAnonymized).toBe(false);
  });

  it("all three privacy modes include the identifiersAnonymized key", () => {
    for (const mode of ["full", "minimal", "redacted"] as const) {
      const b = buildBundleObject(mode, trials, flags, 400, 400, session, csvMeta, null, "2026-01-01T00:00:00Z");
      expect(b.privacy).toHaveProperty("identifiersAnonymized");
    }
  });

  it("bundle sessionResult includes sessionContext key when session has it", () => {
    const sessionWithCtx: SessionResult = {
      ...session,
      sessionContext: {
        deviceClass: "desktop",
        osFamily: "macos",
        browserFamily: "chrome",
        locale: "en-US",
        timeZone: "UTC",
        inputHints: { usedIME: false, totalCompositionCount: 0 },
      },
    };
    const b = buildBundleObject("full", trials, flags, 400, 400, sessionWithCtx, csvMeta, null, "2026-01-01T00:00:00Z");
    const sr = b.sessionResult as Record<string, unknown>;
    expect(sr).toHaveProperty("sessionContext");
  });
});
