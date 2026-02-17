/**
 * Tests for ResultsTableControls — Ticket 0273.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsTableControls, RtBar, rowMatchesFilter } from "../ResultsTableControls";
import type { FilterChip } from "../ResultsTableControls";
import type { FlagKind } from "@/domain";

describe("ResultsTableControls", () => {
  const noop = () => {};

  it("renders all filter chips", () => {
    render(
      <ResultsTableControls
        totalCount={10}
        visibleCount={10}
        activeFilter="all"
        searchQuery=""
        onFilterChange={noop}
        onSearchChange={noop}
      />
    );
    expect(screen.getByTestId("filter-chip-all")).toBeDefined();
    expect(screen.getByTestId("filter-chip-flagged")).toBeDefined();
    expect(screen.getByTestId("filter-chip-empty")).toBeDefined();
    expect(screen.getByTestId("filter-chip-repeated_response")).toBeDefined();
  });

  it("shows visible count label", () => {
    render(
      <ResultsTableControls
        totalCount={20}
        visibleCount={5}
        activeFilter="flagged"
        searchQuery=""
        onFilterChange={noop}
        onSearchChange={noop}
      />
    );
    expect(screen.getByTestId("table-visible-count").textContent).toContain("5");
    expect(screen.getByTestId("table-visible-count").textContent).toContain("20");
  });

  it("calls onFilterChange when chip clicked", () => {
    const onChange = (f: FilterChip) => { received = f; };
    let received: FilterChip = "all";
    render(
      <ResultsTableControls
        totalCount={5}
        visibleCount={5}
        activeFilter="all"
        searchQuery=""
        onFilterChange={onChange}
        onSearchChange={noop}
      />
    );
    fireEvent.click(screen.getByTestId("filter-chip-empty"));
    expect(received).toBe("empty");
  });

  it("calls onSearchChange when typing in search input", () => {
    let received = "";
    render(
      <ResultsTableControls
        totalCount={5}
        visibleCount={5}
        activeFilter="all"
        searchQuery=""
        onFilterChange={noop}
        onSearchChange={(q) => { received = q; }}
      />
    );
    fireEvent.change(screen.getByTestId("table-search-input"), { target: { value: "mother" } });
    expect(received).toBe("mother");
  });
});

describe("rowMatchesFilter", () => {
  const noFlags: FlagKind[] = [];

  it("all filter passes everything", () => {
    expect(rowMatchesFilter("apple", "fruit", noFlags, false, "all", "")).toBe(true);
  });

  it("empty filter excludes non-empty responses", () => {
    expect(rowMatchesFilter("apple", "fruit", noFlags, false, "empty", "")).toBe(false);
    expect(rowMatchesFilter("apple", "", noFlags, false, "empty", "")).toBe(true);
  });

  it("timeout filter only passes timedOut rows", () => {
    expect(rowMatchesFilter("apple", "", noFlags, false, "timeout", "")).toBe(false);
    expect(rowMatchesFilter("apple", "", noFlags, true, "timeout", "")).toBe(true);
  });

  it("repeated_response filter checks flags", () => {
    expect(rowMatchesFilter("apple", "ok", ["repeated_response"], false, "repeated_response", "")).toBe(true);
    expect(rowMatchesFilter("apple", "ok", noFlags, false, "repeated_response", "")).toBe(false);
  });

  it("search by word (case insensitive)", () => {
    expect(rowMatchesFilter("Mother", "ok", noFlags, false, "all", "mother")).toBe(true);
    expect(rowMatchesFilter("River", "ok", noFlags, false, "all", "mother")).toBe(false);
  });

  it("search by response", () => {
    expect(rowMatchesFilter("tree", "Fruit", noFlags, false, "all", "fruit")).toBe(true);
  });

  it("search combined with filter", () => {
    // flagged filter + search: must pass both
    expect(rowMatchesFilter("apple", "fruit", ["repeated_response"], false, "flagged", "apple")).toBe(true);
    expect(rowMatchesFilter("river", "ok", noFlags, false, "flagged", "river")).toBe(false);
  });
});

describe("RtBar", () => {
  it("renders with testid", () => {
    render(<RtBar rt={400} minRt={200} maxRt={800} />);
    expect(screen.getByTestId("rt-bar")).toBeDefined();
  });
});
