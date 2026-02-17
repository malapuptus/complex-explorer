/**
 * Tests for SessionsDrawer — Ticket 0269.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionsDrawer } from "../SessionsDrawer";

const FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter future={FUTURE_FLAGS}>{ui}</MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("SessionsDrawer", () => {
  it("renders the trigger button with default label 'Sessions'", () => {
    renderWithRouter(<SessionsDrawer />);
    expect(screen.getByTestId("sessions-drawer-trigger")).toBeDefined();
    expect(screen.getByTestId("sessions-drawer-trigger").textContent).toBe("Sessions");
  });

  it("renders custom trigger label", () => {
    renderWithRouter(<SessionsDrawer triggerLabel="View History" />);
    expect(screen.getByTestId("sessions-drawer-trigger").textContent).toBe("View History");
  });

  it("drawer is closed by default", () => {
    renderWithRouter(<SessionsDrawer />);
    const btn = screen.getByTestId("sessions-drawer-trigger");
    expect(btn).toBeDefined();
  });

  it("clicking trigger opens sheet — 'Previous Sessions' heading appears", async () => {
    renderWithRouter(<SessionsDrawer />);
    fireEvent.click(screen.getByTestId("sessions-drawer-trigger"));
    // Both SheetTitle (h2) and PreviousSessions h1 contain this text — use getAllBy
    const headings = await screen.findAllByText("Previous Sessions");
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("empty store shows 'No sessions yet.' inside drawer", async () => {
    renderWithRouter(<SessionsDrawer />);
    fireEvent.click(screen.getByTestId("sessions-drawer-trigger"));
    const msg = await screen.findByText("No sessions yet.");
    expect(msg).toBeDefined();
  });
});
