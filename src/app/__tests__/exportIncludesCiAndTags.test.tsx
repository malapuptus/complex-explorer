/**
 * exportIncludesCiAndTags.test.tsx — bundle includes ciCounts + annotationsSummary.
 * Ticket 0280.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { buildBundleObject } from "@/app/ResultsExportActions";
import type { SessionResult } from "@/domain";
import { trialAnnotations } from "@/infra";

beforeEach(() => {
  localStorage.clear();
});

function makeSession(): SessionResult {
  return {
    id: "test-session-280",
    config: {
      stimulusListId: "demo-10",
      stimulusListVersion: "1.0.0",
      maxResponseTimeMs: 0,
      orderPolicy: "fixed",
      seed: null,
    },
    trials: [
      {
        stimulus: { word: "tree", index: 0 },
        association: {
          response: "tree", // RSW
          reactionTimeMs: 400,
          tFirstKeyMs: 100,
          backspaceCount: 0,
          editCount: 0,
          compositionCount: 0,
        },
        isPractice: false,
      },
      {
        stimulus: { word: "house", index: 1 },
        association: {
          response: "big house", // MSW
          reactionTimeMs: 350,
          tFirstKeyMs: 90,
          backspaceCount: 0,
          editCount: 0,
          compositionCount: 0,
        },
        isPractice: false,
      },
    ],
    startedAt: "2025-01-01T00:00:00Z",
    completedAt: "2025-01-01T00:01:00Z",
    scoring: {
      trialFlags: [],
      summary: {
        totalTrials: 2,
        meanReactionTimeMs: 375,
        medianReactionTimeMs: 375,
        stdDevReactionTimeMs: 25,
        emptyResponseCount: 0,
        repeatedResponseCount: 0,
        timingOutlierCount: 0,
        highEditingCount: 0,
        timeoutCount: 0,
      },
    },
    seedUsed: null,
    stimulusOrder: ["tree", "house"],
    provenanceSnapshot: null,
    sessionFingerprint: null,
    scoringVersion: null,
  };
}

describe("buildBundleObject (0280)", () => {
  it("includes ciCounts in the bundle", () => {
    const session = makeSession();
    const bundle = buildBundleObject(
      "full", [], [], 375, 375, session,
      {
        sessionId: session.id,
        packId: "demo-10",
        packVersion: "1.0.0",
        seed: null,
      },
      null, "2025-01-01T00:01:00Z",
    );
    expect(bundle.ciCounts).toBeDefined();
    expect((bundle.ciCounts as Record<string, number>)["RSW"]).toBe(1);
    expect((bundle.ciCounts as Record<string, number>)["MSW"]).toBe(1);
  });

  it("includes annotationsSummary when annotations exist", () => {
    const session = makeSession();
    trialAnnotations.setAnnotation(session.id, 0, { tags: ["DR", "M"], note: "" });
    trialAnnotations.setAnnotation(session.id, 1, { tags: ["DR"], note: "" });

    const bundle = buildBundleObject(
      "full", [], [], 375, 375, session,
      {
        sessionId: session.id,
        packId: "demo-10",
        packVersion: "1.0.0",
        seed: null,
      },
      null, "2025-01-01T00:01:00Z",
    );
    expect(bundle.annotationsSummary).toBeDefined();
    expect((bundle.annotationsSummary as Record<string, number>)["DR"]).toBe(2);
    expect((bundle.annotationsSummary as Record<string, number>)["M"]).toBe(1);
  });

  it("omits annotationsSummary when no annotations exist", () => {
    const session = makeSession();
    const bundle = buildBundleObject(
      "full", [], [], 375, 375, session,
      {
        sessionId: session.id,
        packId: "demo-10",
        packVersion: "1.0.0",
        seed: null,
      },
      null, "2025-01-01T00:01:00Z",
    );
    expect(bundle.annotationsSummary).toBeUndefined();
  });
});
