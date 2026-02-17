/**
 * Tests for baseline overlays on charts — Ticket 0274.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RtTimeline, RtHistogram } from "../ResultsCharts";
import type { TimelinePoint } from "@/domain";

const POINTS: TimelinePoint[] = [
  { sessionTrialIndex: 0, x: 0, y: 300, timedOut: false, flags: [] },
  { sessionTrialIndex: 1, x: 1, y: 500, timedOut: false, flags: [] },
  { sessionTrialIndex: 2, x: 2, y: 400, timedOut: false, flags: [] },
];

const HISTOGRAM = {
  binEdges: [300, 367, 433, 500],
  counts: [1, 1, 1],
};

describe("RtTimeline baseline overlays (0274)", () => {
  it("renders baseline median line when provided", () => {
    const { container } = render(
      <RtTimeline points={POINTS} baselineMedian={400} />
    );
    expect(container.querySelector("[data-testid='baseline-median-line']")).toBeTruthy();
  });

  it("renders baseline p90 line when provided", () => {
    const { container } = render(
      <RtTimeline points={POINTS} baselineP90={480} />
    );
    expect(container.querySelector("[data-testid='baseline-p90-line']")).toBeTruthy();
  });

  it("no overlay lines when baseline not provided", () => {
    const { container } = render(<RtTimeline points={POINTS} />);
    expect(container.querySelector("[data-testid='baseline-median-line']")).toBeNull();
    expect(container.querySelector("[data-testid='baseline-p90-line']")).toBeNull();
  });
});

describe("RtHistogram baseline markers (0274)", () => {
  it("renders baseline median marker when provided", () => {
    const { container } = render(
      <RtHistogram histogram={HISTOGRAM} baselineMedian={380} />
    );
    expect(container.querySelector("[data-testid='baseline-hist-median']")).toBeTruthy();
  });

  it("renders baseline p90 marker when provided", () => {
    const { container } = render(
      <RtHistogram histogram={HISTOGRAM} baselineP90={480} />
    );
    expect(container.querySelector("[data-testid='baseline-hist-p90']")).toBeTruthy();
  });

  it("no markers when baseline not provided", () => {
    const { container } = render(<RtHistogram histogram={HISTOGRAM} />);
    expect(container.querySelector("[data-testid='baseline-hist-median']")).toBeNull();
  });
});
