/**
 * tests for ObserverMode (0285).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ObserverMode } from "@/app/ObserverMode";
import type { TrialRef } from "@/domain";
import { trialAnnotations } from "@/infra";

beforeEach(() => {
  localStorage.clear();
});

function makeRef(word: string, idx: number, response = "ok"): TrialRef {
  return {
    sessionTrialIndex: idx,
    orderIndex: idx,
    position: idx,
    word,
    reactionTimeMs: 400,
    flags: [],
    timedOut: false,
    response,
    responseLen: response.length,
    tFirstKeyMs: null,
    backspaces: 0,
    edits: 0,
    compositions: 0,
  };
}

describe("ObserverMode (0285)", () => {
  const sessionId = "obs-test-session";

  it("renders first trial stimulus word", () => {
    render(
      <ObserverMode
        trialRefs={[makeRef("tree", 0), makeRef("water", 1)]}
        sessionId={sessionId}
      />,
    );
    expect(screen.getByTestId("observer-stimulus-word").textContent).toBe("tree");
  });

  it("navigates to next trial", () => {
    render(
      <ObserverMode
        trialRefs={[makeRef("tree", 0), makeRef("water", 1)]}
        sessionId={sessionId}
      />,
    );
    fireEvent.click(screen.getByTestId("observer-next"));
    expect(screen.getByTestId("observer-stimulus-word").textContent).toBe("water");
  });

  it("prev button is disabled on first trial", () => {
    render(
      <ObserverMode
        trialRefs={[makeRef("tree", 0), makeRef("water", 1)]}
        sessionId={sessionId}
      />,
    );
    expect(screen.getByTestId("observer-prev")).toBeDisabled();
  });

  it("next button is disabled on last trial", () => {
    render(
      <ObserverMode
        trialRefs={[makeRef("tree", 0), makeRef("water", 1)]}
        sessionId={sessionId}
        initialPosition={1}
      />,
    );
    expect(screen.getByTestId("observer-next")).toBeDisabled();
  });

  it("toggling a manual indicator persists to localStorage", () => {
    render(
      <ObserverMode
        trialRefs={[makeRef("tree", 0)]}
        sessionId={sessionId}
      />,
    );
    fireEvent.click(screen.getByTestId("observer-tag-DR"));
    const ann = trialAnnotations.getAnnotation(sessionId, 0);
    expect(ann?.manualIndicators).toContain("DR");
  });

  it("manual tag badge shows tagged indicator name", () => {
    render(
      <ObserverMode
        trialRefs={[makeRef("tree", 0)]}
        sessionId={sessionId}
      />,
    );
    fireEvent.click(screen.getByTestId("observer-tag-M"));
    expect(screen.getByText(/Multimodal/)).toBeTruthy();
  });

  it("manual tags never collide with auto indicator namespace", () => {
    // Manual indicators use ManualIndicatorCode which doesn't include
    // auto FlagKind codes (timing_outlier_slow etc.) — type-level guarantee.
    // Runtime check: annotation stored under manualIndicators, not tags.
    render(
      <ObserverMode
        trialRefs={[makeRef("tree", 0)]}
        sessionId={sessionId}
      />,
    );
    fireEvent.click(screen.getByTestId("observer-tag-B"));
    const ann = trialAnnotations.getAnnotation(sessionId, 0);
    // manualIndicators contains "B", tags is empty (no self-tag was set)
    expect(ann?.manualIndicators).toContain("B");
    expect(ann?.tags ?? []).not.toContain("B");
  });

  it("shows empty state when trialRefs is empty", () => {
    render(<ObserverMode trialRefs={[]} sessionId={sessionId} />);
    expect(screen.getByTestId("observer-mode").textContent).toContain("No trials available");
  });
});
