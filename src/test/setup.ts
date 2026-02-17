import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

/**
 * Console guard — fail tests on unexpected console.warn or console.error.
 *
 * To opt out in a specific test, mock the spy before the call:
 *   vi.spyOn(console, "warn").mockImplementation(() => {});
 *
 * Policy: console.log is blocked by hygiene oracle (check-hygiene.ts).
 * console.warn and console.error are allowed in production code but
 * must not fire unexpectedly during tests.
 */

const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  const warns = warnSpy.mock.calls.slice();
  const errors = errorSpy.mock.calls.slice();
  warnSpy.mockClear();
  errorSpy.mockClear();

  if (warns.length > 0) {
    throw new Error(
      `Unexpected console.warn during test:\n${warns.map((c) => c.map(String).join(" ")).join("\n")}`,
    );
  }
  if (errors.length > 0) {
    throw new Error(
      `Unexpected console.error during test:\n${errors.map((c) => c.map(String).join(" ")).join("\n")}`,
    );
  }
});
