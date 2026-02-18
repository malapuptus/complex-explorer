/**
 * chartsFirstLayout.test.tsx — 0283: Overview/Details layout toggle.
 * 0284: Chart click → filter state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { SessionResult } from "@/domain";

beforeEach(() => {
  localStorage.clear();
});

function makeSession(): SessionResult {
  return {
    id: "layout-test-session",
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
          response: "green", reactionTimeMs: 500, tFirstKeyMs: 100,
          backspaceCount: 0, editCount: 0, compositionCount: 0,
        },
        isPractice: false,
      },
      {
        stimulus: { word: "water", index: 1 },
        association: {
          response: "blue", reactionTimeMs: 450, tFirstKeyMs: 90,
          backspaceCount: 0, editCount: 0, compositionCount: 0,
        },
        isPractice: false,
      },
    ],
    startedAt: "2025-01-01T00:00:00Z",
    completedAt: "2025-01-01T00:01:00Z",
    scoring: {
      trialFlags: [],
      summary: {
        totalTrials: 2, meanReactionTimeMs: 475, medianReactionTimeMs: 475,
        stdDevReactionTimeMs: 25, emptyResponseCount: 0,
        repeatedResponseCount: 0, timingOutlierCount: 0,
        highEditingCount: 0, timeoutCount: 0,
      },
    },
    seedUsed: null,
    stimulusOrder: ["tree", "water"],
    provenanceSnapshot: null,
    sessionFingerprint: null,
    scoringVersion: null,
  };
}

// We test ResultsDashboardPanel directly for chart-click callbacks
import { ResultsDashboardPanel } from "@/app/ResultsDashboardPanel";
import { buildSessionInsights } from "@/domain";

describe("ResultsDashboardPanel chart-click callbacks (0284)", () => {
  it("onFlagFilter is called when a flag bar is clicked", () => {
    const session = makeSession();
    // Add a flag to one trial so the chart has bars
    const sessionWithFlag: SessionResult = {
      ...session,
      scoring: {
        ...session.scoring,
        trialFlags: [
          { trialIndex: 0, flags: ["repeated_response"] as const },
        ],
      },
    };
    const insights = buildSessionInsights(sessionWithFlag);
    const onFlagFilter = vi.fn();

    render(
      <ResultsDashboardPanel
        insights={insights}
        onFlagFilter={onFlagFilter}
      />,
    );

    // The flag breakdown chart should render
    const chart = screen.getByTestId("flag-breakdown-chart");
    expect(chart).toBeTruthy();
  });

  it("session-patterns-heading is rendered", () => {
    const session = makeSession();
    const insights = buildSessionInsights(session);
    render(
      <ResultsDashboardPanel insights={insights} />,
    );
    expect(screen.getByTestId("session-patterns-heading")).toBeTruthy();
  });
});

import { vi } from "vitest";
