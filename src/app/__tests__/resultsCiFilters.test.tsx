/**
 * resultsCiFilters.test.tsx — CI filter chip tests.
 * Ticket 0278.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsTableControls, rowMatchesFilter } from "@/app/ResultsTableControls";

describe("ResultsTableControls CI chips", () => {
  const baseProps = {
    totalCount: 10,
    visibleCount: 10,
    activeFilter: "all" as const,
    searchQuery: "",
    onFilterChange: () => {},
    onSearchChange: () => {},
    onCiCodeChange: () => {},
    activeCiCode: null,
  };

  it("shows CI chips row only when ciCounts has entries", () => {
    const { rerender } = render(<ResultsTableControls {...baseProps} ciCounts={{}} />);
    expect(screen.queryByTestId("ci-chips-row")).toBeNull();

    rerender(<ResultsTableControls {...baseProps} ciCounts={{ F: 3, MSW: 1 }} />);
    expect(screen.getByTestId("ci-chips-row")).toBeDefined();
  });

  it("renders chips only for non-zero CI counts", () => {
    render(<ResultsTableControls {...baseProps} ciCounts={{ F: 3, MSW: 0, RSW: 2 }} />);
    expect(screen.getByTestId("ci-chip-F")).toBeDefined();
    expect(screen.getByTestId("ci-chip-RSW")).toBeDefined();
    expect(screen.queryByTestId("ci-chip-MSW")).toBeNull();
  });

  it("clicking a CI chip calls onCiCodeChange with that code", () => {
    const onCiCodeChange = vi.fn();
    render(
      <ResultsTableControls
        {...baseProps}
        ciCounts={{ RSW: 2 }}
        onCiCodeChange={onCiCodeChange}
      />,
    );
    fireEvent.click(screen.getByTestId("ci-chip-RSW"));
    expect(onCiCodeChange).toHaveBeenCalledWith("RSW");
  });

  it("clicking active CI chip calls onCiCodeChange with null (deselect)", () => {
    const onCiCodeChange = vi.fn();
    render(
      <ResultsTableControls
        {...baseProps}
        ciCounts={{ RSW: 2 }}
        activeCiCode="RSW"
        onCiCodeChange={onCiCodeChange}
      />,
    );
    fireEvent.click(screen.getByTestId("ci-chip-RSW"));
    expect(onCiCodeChange).toHaveBeenCalledWith(null);
  });
});

describe("rowMatchesFilter with CI code", () => {
  it("filters to only RSW when activeCiCode=RSW", () => {
    const keep = rowMatchesFilter("tree", "tree", [], false, "all", "", "RSW", ["RSW"]);
    const skip = rowMatchesFilter("tree", "leaf", [], false, "all", "", "RSW", ["F"]);
    expect(keep).toBe(true);
    expect(skip).toBe(false);
  });

  it("no CI filter → falls through to flag filter", () => {
    const all = rowMatchesFilter("tree", "leaf", [], false, "all", "", null, []);
    const flagged = rowMatchesFilter("tree", "leaf", ["timeout"] as never, false, "flagged", "", null, []);
    expect(all).toBe(true);
    expect(flagged).toBe(true);
  });
});
