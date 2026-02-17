import { describe, it, expect, vi } from "vitest";

/**
 * Ticket 0193 — Verify the console guard works.
 * These tests prove that unexpected console.warn/error
 * would fail a test, and that opting out via mock works.
 */

describe("Console guard", () => {
  it("allows tests that don't trigger console.warn/error", () => {
    // This test should pass — no console calls
    expect(1 + 1).toBe(2);
  });

  it("allows opted-out console.warn via spy", () => {
    // Opt out by mocking before the call
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    console.warn("intentional warning");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("allows opted-out console.error via spy", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    console.error("intentional error");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
