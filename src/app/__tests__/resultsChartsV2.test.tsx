/**
 * Tests for ResultsCharts v2 — Ticket 0272.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagBreakdownChart, ResponseClusters } from "../ResultsCharts";
import type { FlagKind } from "@/domain";

describe("FlagBreakdownChart (0272)", () => {
  it("renders chart with testid when counts exist", () => {
    const counts: Partial<Record<FlagKind, number>> = { repeated_response: 9, timeout: 1 };
    render(<FlagBreakdownChart counts={counts} />);
    expect(screen.getByTestId("flag-breakdown-chart")).toBeDefined();
  });

  it("renders 'No flags' when all counts zero", () => {
    render(<FlagBreakdownChart counts={{}} />);
    expect(screen.getByTestId("flag-breakdown-chart")).toBeDefined();
    expect(screen.getByText("No flags")).toBeDefined();
  });

  it("shows repeated_response count label", () => {
    const counts: Partial<Record<FlagKind, number>> = { repeated_response: 9 };
    render(<FlagBreakdownChart counts={counts} />);
    expect(screen.getByText("9")).toBeDefined();
  });
});

describe("ResponseClusters (0272)", () => {
  it("renders cluster list with testid", () => {
    const clusters = [
      { response: "ss", count: 3, words: ["tree", "house", "water"], sessionTrialIndices: [0, 1, 2] },
    ];
    render(<ResponseClusters clusters={clusters} />);
    expect(screen.getByTestId("response-clusters")).toBeDefined();
    expect(screen.getByText("ss")).toBeDefined();
  });

  it("renders 'No repeated responses' when empty", () => {
    render(<ResponseClusters clusters={[]} />);
    expect(screen.getByText("No repeated responses")).toBeDefined();
  });

  it("shows count in cluster row", () => {
    const clusters = [
      { response: "ok", count: 4, words: ["a", "b", "c", "d"], sessionTrialIndices: [0, 1, 2, 3] },
    ];
    render(<ResponseClusters clusters={clusters} />);
    expect(screen.getByText(/4×/)).toBeDefined();
  });
});
