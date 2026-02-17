/**
 * sessionContext — coarse, privacy-preserving environment hints.
 * Ticket 0259: no raw UA, no screen resolution, no IP-ish identifiers.
 * Pure helper (can be called in browser only — uses navigator / Intl).
 */

import type { SessionContext } from "./types";
import type { Trial } from "./types";

type DeviceClass = SessionContext["deviceClass"];
type OsFamily = SessionContext["osFamily"];
type BrowserFamily = SessionContext["browserFamily"];

/** Derive coarse device class from navigator.userAgent (read-only, no storage). */
export function detectDeviceClass(ua: string): DeviceClass {
  const u = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(u)) return "tablet";
  if (/mobile|android|iphone|ipod|opera mini|iemobile|wpdesktop/.test(u)) return "mobile";
  if (u.length > 0) return "desktop";
  return "unknown";
}

/** Derive coarse OS family from userAgent. */
export function detectOsFamily(ua: string): OsFamily {
  const u = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(u)) return "ios";
  if (/android/.test(u)) return "android";
  if (/mac os x|macintosh/.test(u)) return "macos";
  if (/windows/.test(u)) return "windows";
  if (/linux/.test(u)) return "linux";
  return "unknown";
}

/** Derive coarse browser family from userAgent. */
export function detectBrowserFamily(ua: string): BrowserFamily {
  const u = ua.toLowerCase();
  if (/edg\//.test(u)) return "edge";
  if (/firefox|fxios/.test(u)) return "firefox";
  // Chrome check must come after Edge (Edge UA contains "chrome")
  if (/chrome|crios/.test(u)) return "chrome";
  if (/safari/.test(u)) return "safari";
  return "unknown";
}

/** Compute totalCompositionCount across all (non-practice) trials. */
export function sumCompositionCount(trials: Pick<Trial, "association" | "isPractice">[]): number {
  return trials
    .filter((t) => !t.isPractice)
    .reduce((acc, t) => acc + (t.association.compositionCount ?? 0), 0);
}

/**
 * Build a SessionContext from browser globals.
 * Safe to call in non-browser environments — returns a mostly-unknown context.
 */
export function buildSessionContext(
  trials: Pick<Trial, "association" | "isPractice">[],
): SessionContext {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const locale =
    typeof navigator !== "undefined" ? navigator.language ?? null : null;
  let timeZone: string | null = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    /* unavailable */
  }

  const totalCompositionCount = sumCompositionCount(trials);

  return {
    deviceClass: detectDeviceClass(ua),
    osFamily: detectOsFamily(ua),
    browserFamily: detectBrowserFamily(ua),
    locale,
    timeZone,
    inputHints: {
      usedIME: totalCompositionCount > 0,
      totalCompositionCount,
    },
  };
}
