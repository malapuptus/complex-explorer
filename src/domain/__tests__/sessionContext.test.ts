/**
 * Ticket 0259 — sessionContext contract tests.
 * Proves coarse environment hints are captured correctly.
 */

import { describe, it, expect } from "vitest";
import {
  detectDeviceClass,
  detectOsFamily,
  detectBrowserFamily,
  sumCompositionCount,
  buildSessionContext,
} from "@/domain/sessionContext";
import type { Trial } from "@/domain/types";

function makeTrial(compositionCount = 0): Trial {
  return {
    stimulus: { word: "x", index: 0 },
    association: {
      response: "y",
      reactionTimeMs: 400,
      tFirstKeyMs: 100,
      backspaceCount: 0,
      editCount: 1,
      compositionCount,
    },
    isPractice: false,
  };
}

describe("detectDeviceClass", () => {
  it("returns desktop for regular UA", () => {
    expect(detectDeviceClass("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")).toBe("desktop");
  });
  it("returns mobile for iPhone UA", () => {
    expect(detectDeviceClass("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("mobile");
  });
  it("returns tablet for iPad UA", () => {
    expect(detectDeviceClass("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
  });
  it("returns unknown for empty UA", () => {
    expect(detectDeviceClass("")).toBe("unknown");
  });
});

describe("detectOsFamily", () => {
  it("detects macos", () => {
    expect(detectOsFamily("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)")).toBe("macos");
  });
  it("detects windows", () => {
    expect(detectOsFamily("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
  });
  it("detects ios", () => {
    expect(detectOsFamily("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
  });
  it("detects android", () => {
    expect(detectOsFamily("Mozilla/5.0 (Linux; Android 13; Pixel 7)")).toBe("android");
  });
  it("detects linux", () => {
    expect(detectOsFamily("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")).toBe("linux");
  });
  it("returns unknown for empty UA", () => {
    expect(detectOsFamily("")).toBe("unknown");
  });
});

describe("detectBrowserFamily", () => {
  it("detects chrome", () => {
    expect(detectBrowserFamily("Mozilla/5.0 Chrome/121.0")).toBe("chrome");
  });
  it("detects firefox", () => {
    expect(detectBrowserFamily("Mozilla/5.0 Firefox/122.0")).toBe("firefox");
  });
  it("detects safari (not chrome)", () => {
    expect(detectBrowserFamily("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Safari/537.36")).toBe("safari");
  });
  it("detects edge (edg/ prefix takes priority over chrome)", () => {
    expect(detectBrowserFamily("Mozilla/5.0 Chrome/120.0 Edg/120.0")).toBe("edge");
  });
  it("returns unknown for empty UA", () => {
    expect(detectBrowserFamily("")).toBe("unknown");
  });
});

describe("sumCompositionCount", () => {
  it("sums compositionCount across scored trials", () => {
    const trials = [makeTrial(2), makeTrial(0), makeTrial(3)];
    expect(sumCompositionCount(trials)).toBe(5);
  });

  it("excludes practice trials", () => {
    const practice: Trial = { ...makeTrial(10), isPractice: true };
    const scored: Trial = makeTrial(2);
    expect(sumCompositionCount([practice, scored])).toBe(2);
  });

  it("returns 0 when no trials", () => {
    expect(sumCompositionCount([])).toBe(0);
  });
});

describe("buildSessionContext", () => {
  it("usedIME is true when any composition count > 0", () => {
    const trials = [makeTrial(0), makeTrial(1)];
    const ctx = buildSessionContext(trials);
    expect(ctx.inputHints?.usedIME).toBe(true);
    expect(ctx.inputHints?.totalCompositionCount).toBe(1);
  });

  it("usedIME is false when all composition counts are 0", () => {
    const trials = [makeTrial(0), makeTrial(0)];
    const ctx = buildSessionContext(trials);
    expect(ctx.inputHints?.usedIME).toBe(false);
    expect(ctx.inputHints?.totalCompositionCount).toBe(0);
  });

  it("returns a SessionContext with required keys", () => {
    const ctx = buildSessionContext([makeTrial(0)]);
    expect(ctx).toHaveProperty("deviceClass");
    expect(ctx).toHaveProperty("osFamily");
    expect(ctx).toHaveProperty("browserFamily");
    expect(ctx).toHaveProperty("inputHints");
  });

  it("deviceClass is a valid value", () => {
    const ctx = buildSessionContext([]);
    expect(["desktop", "mobile", "tablet", "unknown"]).toContain(ctx.deviceClass);
  });
});
