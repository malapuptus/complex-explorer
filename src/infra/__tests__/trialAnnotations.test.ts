/**
 * trialAnnotations.test.ts — storage roundtrip tests.
 * Ticket 0279.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { trialAnnotations } from "@/infra";

beforeEach(() => {
  localStorage.clear();
});

describe("trialAnnotations", () => {
  it("returns null for absent annotation", () => {
    expect(trialAnnotations.getAnnotation("sess1", 0)).toBeNull();
  });

  it("roundtrips a tag + note", () => {
    trialAnnotations.setAnnotation("sess1", 2, { tags: ["DR", "M"], note: "test note" });
    const result = trialAnnotations.getAnnotation("sess1", 2);
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(["DR", "M"]);
    expect(result!.note).toBe("test note");
  });

  it("deletes annotation when tags and note are empty", () => {
    trialAnnotations.setAnnotation("sess1", 0, { tags: ["DR"], note: "x" });
    trialAnnotations.setAnnotation("sess1", 0, { tags: [], note: "" });
    expect(trialAnnotations.getAnnotation("sess1", 0)).toBeNull();
  });

  it("getSessionAnnotations returns all for a session", () => {
    trialAnnotations.setAnnotation("sess1", 0, { tags: ["M"], note: "" });
    trialAnnotations.setAnnotation("sess1", 3, { tags: ["S"], note: "note" });
    const all = trialAnnotations.getSessionAnnotations("sess1");
    expect(all[0]).toBeDefined();
    expect(all[3]).toBeDefined();
    expect(all[1]).toBeUndefined();
  });

  it("getAnnotationSummary counts correctly", () => {
    trialAnnotations.setAnnotation("sess1", 0, { tags: ["DR", "M"], note: "" });
    trialAnnotations.setAnnotation("sess1", 1, { tags: ["DR"], note: "" });
    const summary = trialAnnotations.getAnnotationSummary("sess1");
    expect(summary.DR).toBe(2);
    expect(summary.M).toBe(1);
    expect(summary.Med).toBeUndefined();
  });

  it("separate sessions are isolated", () => {
    trialAnnotations.setAnnotation("sess1", 0, { tags: ["S"], note: "" });
    const result = trialAnnotations.getAnnotation("sess2", 0);
    expect(result).toBeNull();
  });
});
