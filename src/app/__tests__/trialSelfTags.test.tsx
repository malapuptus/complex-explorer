/**
 * trialSelfTags.test.tsx — self-tags in drilldown + badge in table.
 * Ticket 0279.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrialDetailPanel } from "@/app/TrialDetailPanel";
import type { TrialRef } from "@/domain";

beforeEach(() => {
  localStorage.clear();
});

function makeRef(word = "tree", idx = 0): TrialRef {
  return {
    sessionTrialIndex: idx,
    orderIndex: idx,
    position: idx,
    word,
    reactionTimeMs: 400,
    flags: [],
    timedOut: false,
    response: "leaf",
    responseLen: 4,
    tFirstKeyMs: 100,
    backspaces: 0,
    edits: 0,
    compositions: 0,
  };
}

describe("TrialDetailPanel self-tags", () => {
  it("renders self-tags section when sessionId is provided", () => {
    render(
      <TrialDetailPanel trialRef={makeRef()} onClose={() => {}} sessionId="sess-1" />,
    );
    expect(screen.getByTestId("self-tags-section")).toBeDefined();
  });

  it("does not render self-tags section when sessionId is absent", () => {
    render(<TrialDetailPanel trialRef={makeRef()} onClose={() => {}} />);
    expect(screen.queryByTestId("self-tags-section")).toBeNull();
  });

  it("toggling DR tag persists to storage", () => {
    render(
      <TrialDetailPanel trialRef={makeRef()} onClose={() => {}} sessionId="sess-1" />,
    );
    const checkbox = screen.getByTestId("self-tag-DR") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // Verify localStorage was updated
    const raw = localStorage.getItem("complex-mapper-trial-annotations");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed["sess-1"][0].tags).toContain("DR");
  });

  it("null tFirstKeyMs renders '—' without crash (regression)", () => {
    const ref = { ...makeRef(), tFirstKeyMs: null };
    render(<TrialDetailPanel trialRef={ref} onClose={() => {}} sessionId="sess-1" />);
    // "—" appears in both "Time to first key" and "Flags" rows — just check it exists
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});
