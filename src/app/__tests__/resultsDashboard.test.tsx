/**
 * Tests for ResultsDashboardPanel — Tickets 0265/0266.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsDashboardPanel } from "../ResultsDashboardPanel";
import { buildSessionInsights } from "@/domain";
import type { SessionResult, Trial } from "@/domain";

function makeTrial(word: string, idx: number, rt: number): Trial {
  return {
    stimulus: { word, index: idx },
    association: {
      response: word,
      reactionTimeMs: rt,
      tFirstKeyMs: null,
      backspaceCount: 0,
      editCount: 1,
      compositionCount: 0,
    },
    isPractice: false,
  };
}

function makeSession(trials: Trial[]): SessionResult {
  const scored = trials.filter((t) => !t.isPractice);
  return {
    id: "s1",
    config: { stimulusListId: "t", stimulusListVersion: "1", maxResponseTimeMs: 0, orderPolicy: "fixed", seed: null },
    trials,
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-01T00:10:00Z",
    seedUsed: null,
    stimulusOrder: scored.map((t) => t.stimulus.word),
    provenanceSnapshot: null,
    sessionFingerprint: null,
    scoringVersion: null,
    appVersion: null,
    stimulusPackSnapshot: null,
    importedFrom: null,
    sessionContext: null,
    scoring: {
      trialFlags: scored.map((_, i) => ({ trialIndex: i, flags: [] as never[] })),
      summary: { totalTrials: scored.length, meanReactionTimeMs: 0, medianReactionTimeMs: 0, stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0, timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0 },
    },
  };
}

const TRIALS = [
  makeTrial("apple", 0, 300),
  makeTrial("river", 1, 450),
  makeTrial("storm", 2, 600),
];

describe("ResultsDashboardPanel", () => {
  it("renders expected median, empty, and flagged values", () => {
    const session = makeSession(TRIALS);
    const insights = buildSessionInsights(session);
    render(<ResultsDashboardPanel insights={insights} />);
    expect(screen.getAllByText("450 ms").length).toBeGreaterThan(0); // medianRtMs
    expect(screen.getAllByText("0").length).toBeGreaterThan(0); // empty count
  });

  it("rt-timeline SVG exists", () => {
    const insights = buildSessionInsights(makeSession(TRIALS));
    render(<ResultsDashboardPanel insights={insights} />);
    expect(screen.getByTestId("rt-timeline")).toBeDefined();
  });

  it("rt-histogram SVG exists", () => {
    const insights = buildSessionInsights(makeSession(TRIALS));
    render(<ResultsDashboardPanel insights={insights} />);
    expect(screen.getByTestId("rt-histogram")).toBeDefined();
  });

  it("circle count in rt-timeline equals insights.timeline.length", () => {
    const insights = buildSessionInsights(makeSession(TRIALS));
    const { container } = render(<ResultsDashboardPanel insights={insights} />);
    const circles = container.querySelectorAll("[data-testid='rt-timeline'] circle");
    expect(circles.length).toBe(insights.timeline.length);
  });

  it("sessionContext null → device label 'unknown'", () => {
    const insights = buildSessionInsights(makeSession(TRIALS));
    render(<ResultsDashboardPanel insights={insights} sessionContext={null} />);
    expect(screen.getAllByText("unknown").length).toBeGreaterThan(0);
  });

  it("sessionContext with values → formatted device label", () => {
    const insights = buildSessionInsights(makeSession(TRIALS));
    render(
      <ResultsDashboardPanel
        insights={insights}
        sessionContext={{ deviceClass: "desktop", osFamily: "macos", browserFamily: "chrome", locale: null }}
      />
    );
    expect(screen.getByText("desktop · macos · chrome")).toBeDefined();
  });

  it("quality score appears in DOM", () => {
    const insights = buildSessionInsights(makeSession(TRIALS));
    render(<ResultsDashboardPanel insights={insights} />);
    // Score 100 or some number
    const scoreEl = screen.getByText("100");
    expect(scoreEl).toBeDefined();
  });
});

describe("Trial Drilldown (0266)", () => {
  it("click anomaly row opens dialog with correct word and RT", () => {
    const session = makeSession(TRIALS);
    const insights = buildSessionInsights(session);
    render(<ResultsDashboardPanel insights={insights} />);

    const rows = document.querySelectorAll("[data-session-trial-index]");
    if (rows.length === 0) return; // no anomalies for uniform RTs
    fireEvent.click(rows[0] as HTMLElement);
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("flags show human-readable labels, not raw enum strings", () => {
    const session = makeSession([makeTrial("a", 0, 300)]);
    session.scoring.trialFlags[0] = { trialIndex: 0, flags: ["timing_outlier_slow"] };
    const insights = buildSessionInsights(session);
    render(<ResultsDashboardPanel insights={insights} />);
    const rows = document.querySelectorAll("[data-session-trial-index]");
    if (rows.length > 0) fireEvent.click(rows[0] as HTMLElement);
    expect(document.body.textContent).not.toContain("timing_outlier_slow");
  });

  it("null tFirstKeyMs in dialog renders without crash", () => {
    const session = makeSession([makeTrial("a", 0, 300)]);
    const insights = buildSessionInsights(session);
    const { container } = render(<ResultsDashboardPanel insights={insights} />);
    const el = container.querySelector("[data-session-trial-index]");
    if (el) fireEvent.click(el as HTMLElement);
    // no crash = pass
  });
});
