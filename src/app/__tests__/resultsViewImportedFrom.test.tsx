import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsView } from "@/app/ResultsView";
import type { SessionResult } from "@/domain/types";

/**
 * Ticket 0257 — importedFrom displayed in ResultsView Reproducibility Bundle.
 */

const baseSession: SessionResult = {
  id: "imported-session-1",
  config: {
    stimulusListId: "demo-10", stimulusListVersion: "1.0.0",
    maxResponseTimeMs: 0, orderPolicy: "fixed", seed: null,
  },
  trials: [],
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-01T00:01:00Z",
  scoring: {
    trialFlags: [],
    summary: {
      totalTrials: 0, meanReactionTimeMs: 0, medianReactionTimeMs: 0,
      stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0,
      timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0,
    },
  },
  seedUsed: null, stimulusOrder: [],
  provenanceSnapshot: null, sessionFingerprint: "abc123def456",
  scoringVersion: "scoring_v2_mad_3.5", appVersion: "1.0.0",
  stimulusPackSnapshot: null,
};

const csvMeta = {
  sessionId: "imported-session-1",
  packId: "demo-10",
  packVersion: "1.0.0",
  seed: null as number | null,
  sessionFingerprint: "abc123def456",
  orderPolicy: "fixed" as const,
};

describe("0257 — importedFrom displayed in ResultsView Reproducibility Bundle", () => {
  it("shows 'Imported from' row when importedFrom is present", () => {
    const sessionWithImport: SessionResult = {
      ...baseSession,
      importedFrom: {
        packageVersion: "pkg_v1",
        packageHash: "deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234",
        originalSessionId: "original-before-collision",
      },
    };
    render(
      <ResultsView
        trials={[]}
        trialFlags={[]}
        meanReactionTimeMs={0}
        medianReactionTimeMs={0}
        onReset={() => {}}
        sessionResult={sessionWithImport}
        csvMeta={csvMeta}
      />,
    );
    expect(screen.getByText("Imported from")).toBeTruthy();
    expect(screen.getByText("pkg_v1")).toBeTruthy();
  });

  it("shows package hash prefix row", () => {
    const sessionWithImport: SessionResult = {
      ...baseSession,
      importedFrom: {
        packageVersion: "pkg_v1",
        packageHash: "deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234",
        originalSessionId: "original-before-collision",
      },
    };
    render(
      <ResultsView
        trials={[]}
        trialFlags={[]}
        meanReactionTimeMs={0}
        medianReactionTimeMs={0}
        onReset={() => {}}
        sessionResult={sessionWithImport}
        csvMeta={csvMeta}
      />,
    );
    expect(screen.getByText("Package hash")).toBeTruthy();
    expect(screen.getByText(/deadbeefcafe1234/)).toBeTruthy();
  });

  it("shows originalSessionId row when present", () => {
    const sessionWithImport: SessionResult = {
      ...baseSession,
      importedFrom: {
        packageVersion: "pkg_v1",
        packageHash: "deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234",
        originalSessionId: "original-before-collision",
      },
    };
    render(
      <ResultsView
        trials={[]}
        trialFlags={[]}
        meanReactionTimeMs={0}
        medianReactionTimeMs={0}
        onReset={() => {}}
        sessionResult={sessionWithImport}
        csvMeta={csvMeta}
      />,
    );
    expect(screen.getByText("Original session id")).toBeTruthy();
    expect(screen.getByText("original-before-collision")).toBeTruthy();
  });

  it("shows nothing extra for non-imported session (no placeholders)", () => {
    const localSession: SessionResult = {
      ...baseSession,
      importedFrom: null,
    };
    render(
      <ResultsView
        trials={[]}
        trialFlags={[]}
        meanReactionTimeMs={0}
        medianReactionTimeMs={0}
        onReset={() => {}}
        sessionResult={localSession}
        csvMeta={csvMeta}
      />,
    );
    expect(screen.queryByText("Imported from")).toBeNull();
    expect(screen.queryByText("Package hash")).toBeNull();
    expect(screen.queryByText("Original session id")).toBeNull();
  });
});
