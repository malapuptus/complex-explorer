/**
 * ResultsTableControls — filter chips + search + RT bar for the session results table.
 * Ticket 0273.
 */

import type { FlagKind } from "@/domain";

export type FilterChip =
  | "all"
  | "flagged"
  | "empty"
  | "timeout"
  | "repeated_response"
  | "timing_outlier_slow"
  | "timing_outlier_fast";

interface Props {
  totalCount: number;
  visibleCount: number;
  activeFilter: FilterChip;
  searchQuery: string;
  onFilterChange: (filter: FilterChip) => void;
  onSearchChange: (query: string) => void;
}

const CHIP_LABELS: Record<FilterChip, string> = {
  all: "All",
  flagged: "Flagged",
  empty: "Empty",
  timeout: "Timeout",
  repeated_response: "Repeated response",
  timing_outlier_slow: "Slow outliers",
  timing_outlier_fast: "Fast outliers",
};

const CHIPS: FilterChip[] = [
  "all",
  "flagged",
  "empty",
  "timeout",
  "repeated_response",
  "timing_outlier_slow",
  "timing_outlier_fast",
];

export function ResultsTableControls({
  totalCount,
  visibleCount,
  activeFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: Props) {
  return (
    <div className="mb-3 space-y-2" data-testid="results-table-controls">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            data-testid={`filter-chip-${chip}`}
            onClick={() => onFilterChange(chip)}
            className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
              activeFilter === chip
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {CHIP_LABELS[chip]}
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          data-testid="table-search-input"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search word or response…"
          className="flex-1 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span
          data-testid="table-visible-count"
          className="shrink-0 text-xs text-muted-foreground"
        >
          Showing {visibleCount} of {totalCount}
        </span>
      </div>
    </div>
  );
}

/** Returns true if the row matches the active filter and search query. */
export function rowMatchesFilter(
  word: string,
  response: string,
  flags: readonly FlagKind[],
  timedOut: boolean,
  filter: FilterChip,
  searchQuery: string,
): boolean {
  // Apply filter
  if (filter !== "all") {
    if (filter === "flagged" && flags.length === 0) return false;
    if (filter === "empty" && response !== "") return false;
    if (filter === "timeout" && !timedOut) return false;
    if (
      filter === "repeated_response" ||
      filter === "timing_outlier_slow" ||
      filter === "timing_outlier_fast"
    ) {
      if (!flags.includes(filter as FlagKind)) return false;
    }
  }

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    if (!word.toLowerCase().includes(q) && !response.toLowerCase().includes(q)) return false;
  }

  return true;
}

interface RtBarProps {
  rt: number;
  minRt: number;
  maxRt: number;
}

/** Inline RT bar for table rows. */
export function RtBar({ rt, minRt, maxRt }: RtBarProps) {
  const range = maxRt - minRt || 1;
  const pct = Math.max(4, Math.min(100, ((rt - minRt) / range) * 100));
  return (
    <div
      data-testid="rt-bar"
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      aria-label={`RT: ${rt}ms`}
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${pct}%`, opacity: 0.6 }}
      />
    </div>
  );
}
