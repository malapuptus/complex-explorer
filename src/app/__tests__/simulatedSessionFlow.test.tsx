/**
 * simulatedSessionFlow — integration test for dashboard + simulated session.
 * Ticket 0268.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { simulateSession } from "@/domain";
import { buildSessionInsights, computeQualityIndex, getMicroGoal } from "@/domain";
import { ResultsDashboardPanel } from "../ResultsDashboardPanel";

describe("simulatedSessionFlow", () => {
  it("builds insights from simulated session without throwing", () => {
    const session = simulateSession(1);
    expect(() => buildSessionInsights(session)).not.toThrow();
  });

  it("quality score is between 0 and 100", () => {
    const session = simulateSession(42);
    const insights = buildSessionInsights(session);
    const qi = computeQualityIndex(insights);
    expect(qi.score).toBeGreaterThanOrEqual(0);
    expect(qi.score).toBeLessThanOrEqual(100);
  });

  it("micro-goal is a non-empty string", () => {
    const session = simulateSession(7);
    const insights = buildSessionInsights(session);
    const goal = getMicroGoal(insights);
    expect(typeof goal).toBe("string");
    expect(goal.length).toBeGreaterThan(0);
  });

  it("dashboard renders quality score in DOM", () => {
    const session = simulateSession(1);
    const insights = buildSessionInsights(session);
    render(<ResultsDashboardPanel insights={insights} />);
    // Quality score should be visible (0-100) — use getAllBy since numbers may repeat
    const scoreEls = screen.queryAllByText(/^\d+$/);
    expect(scoreEls.length).toBeGreaterThan(0);
  });

  it("dashboard renders micro-goal text in DOM", () => {
    const session = simulateSession(1);
    const insights = buildSessionInsights(session);
    render(<ResultsDashboardPanel insights={insights} />);
    // Micro-goal text starts with "Next run:"
    const goalEl = screen.queryByText(/Next run:/);
    expect(goalEl).not.toBeNull();
  });
});
