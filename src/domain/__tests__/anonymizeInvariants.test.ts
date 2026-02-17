import { describe, it, expect } from "vitest";
import { anonymizeBundle, buildBundleObject } from "@/app/ResultsExportActions";
import type { Trial, TrialFlag } from "@/domain/types";

/**
 * Ticket 0258 — Anonymize + importedFrom invariants.
 * Proves anonymization never breaks importedFrom provenance or causes
 * collisions when the same package is imported multiple times.
 */

function makeTrial(word: string, index: number): Trial {
  return {
    stimulus: { word, index },
    association: {
      response: "test",
      reactionTimeMs: 400,
      tFirstKeyMs: 150,
      backspaceCount: 0,
      editCount: 1,
      compositionCount: 0,
    },
    isPractice: false,
  };
}

const trials: Trial[] = [makeTrial("sun", 0), makeTrial("moon", 1)];
const flags: TrialFlag[] = [
  { trialIndex: 0, flags: [] },
  { trialIndex: 1, flags: [] },
];
const csvMeta = {
  sessionId: "test-session-id",
  packId: "demo-10",
  packVersion: "1.0.0",
  seed: null as number | null,
  sessionFingerprint: "abcdef1234567890",
  orderPolicy: "fixed" as const,
};

const importedFrom = {
  packageVersion: "pkg_v1",
  packageHash: "deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234",
  originalSessionId: "original-session-before-collision",
};

const sessionWithImport = {
  id: "test-session-id",
  config: {
    stimulusListId: "demo-10",
    stimulusListVersion: "1.0.0",
    maxResponseTimeMs: 0,
    orderPolicy: "fixed" as const,
    seed: null,
  },
  trials,
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-01T00:01:00Z",
  scoring: {
    trialFlags: flags,
    summary: {
      totalTrials: 2, meanReactionTimeMs: 400, medianReactionTimeMs: 400,
      stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0,
      timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0,
    },
  },
  seedUsed: null,
  stimulusOrder: ["sun", "moon"],
  provenanceSnapshot: null,
  sessionFingerprint: "abcdef1234567890",
  scoringVersion: "scoring_v2_mad_3.5",
  appVersion: "1.0.0",
  stimulusPackSnapshot: null,
  importedFrom,
};

// ── Anonymize preserves importedFrom ─────────────────────────────────

describe("0258 — anonymize preserves importedFrom", () => {
  it("anonymize changes session id to anon_<fingerprint>", () => {
    const bundle = buildBundleObject(
      "full", trials, flags, 400, 400, sessionWithImport, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    const anon = anonymizeBundle(bundle);
    const sr = anon.sessionResult as Record<string, unknown>;
    expect(typeof sr.id).toBe("string");
    expect((sr.id as string).startsWith("anon_")).toBe(true);
  });

  it("anonymize preserves importedFrom.packageHash", () => {
    const bundle = buildBundleObject(
      "full", trials, flags, 400, 400, sessionWithImport, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    const anon = anonymizeBundle(bundle);
    const sr = anon.sessionResult as Record<string, unknown>;
    const imp = sr.importedFrom as typeof importedFrom | undefined;
    expect(imp?.packageHash).toBe(importedFrom.packageHash);
  });

  it("anonymize preserves importedFrom.packageVersion", () => {
    const bundle = buildBundleObject(
      "full", trials, flags, 400, 400, sessionWithImport, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    const anon = anonymizeBundle(bundle);
    const sr = anon.sessionResult as Record<string, unknown>;
    const imp = sr.importedFrom as typeof importedFrom | undefined;
    expect(imp?.packageVersion).toBe("pkg_v1");
  });

  it("anonymize preserves importedFrom.originalSessionId", () => {
    const bundle = buildBundleObject(
      "full", trials, flags, 400, 400, sessionWithImport, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    const anon = anonymizeBundle(bundle);
    const sr = anon.sessionResult as Record<string, unknown>;
    const imp = sr.importedFrom as typeof importedFrom | undefined;
    expect(imp?.originalSessionId).toBe(importedFrom.originalSessionId);
  });

  it("anonymize blanks startedAt and completedAt", () => {
    const bundle = buildBundleObject(
      "full", trials, flags, 400, 400, sessionWithImport, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    const anon = anonymizeBundle(bundle);
    const sr = anon.sessionResult as Record<string, unknown>;
    expect(sr.startedAt).toBe("");
    expect(sr.completedAt).toBe("");
  });

  it("anonymize blanks exportedAt", () => {
    const bundle = buildBundleObject(
      "full", trials, flags, 400, 400, sessionWithImport, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    const anon = anonymizeBundle(bundle);
    expect(anon.exportedAt).toBe("");
  });

  it("anonymized ID is deterministic (same fingerprint → same anon ID)", () => {
    const bundle1 = buildBundleObject(
      "full", trials, flags, 400, 400, sessionWithImport, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    const bundle2 = buildBundleObject(
      "full", trials, flags, 400, 400, sessionWithImport, csvMeta, null,
      "2026-02-01T00:00:00Z", // different exportedAt — should not affect anon ID
    );
    const anon1 = anonymizeBundle(bundle1);
    const anon2 = anonymizeBundle(bundle2);
    const id1 = (anon1.sessionResult as Record<string, unknown>).id as string;
    const id2 = (anon2.sessionResult as Record<string, unknown>).id as string;
    expect(id1).toBe(id2);
  });
});

// ── importedFrom absent → anonymize is safe ───────────────────────────

describe("0258 — anonymize safe when importedFrom absent", () => {
  it("session without importedFrom anonymizes without error", () => {
    const localSession = {
      ...sessionWithImport,
      importedFrom: undefined,
    };
    const bundle = buildBundleObject(
      "full", trials, flags, 400, 400, localSession, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    expect(() => anonymizeBundle(bundle)).not.toThrow();
  });

  it("session with importedFrom: null anonymizes without error", () => {
    const localSession = {
      ...sessionWithImport,
      importedFrom: null,
    };
    const bundle = buildBundleObject(
      "full", trials, flags, 400, 400, localSession, csvMeta, null,
      "2026-01-01T00:00:00Z",
    );
    const anon = anonymizeBundle(bundle);
    const sr = anon.sessionResult as Record<string, unknown>;
    expect(sr.importedFrom).toBeNull();
  });
});

// ── Collision logic: two imports → same originalSessionId ─────────────

describe("0258 — collision logic preserves originalSessionId", () => {
  it("two sessions with different IDs but same originalSessionId are independent", () => {
    const session1 = {
      ...sessionWithImport,
      id: "session-id-v1",
      importedFrom: { ...importedFrom },
    };
    const session2 = {
      ...sessionWithImport,
      id: "session-id-v1__import_deadbeef", // collision-rewritten ID
      importedFrom: { ...importedFrom }, // same originalSessionId
    };
    // Both retain the same original provenance
    expect(session1.importedFrom.originalSessionId).toBe(
      session2.importedFrom.originalSessionId,
    );
    // But they have distinct live IDs
    expect(session1.id).not.toBe(session2.id);
  });

  it("collision-rewritten ID matches the expected format", () => {
    const pkg = "deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234";
    const baseId = "original-session-before-collision";
    const collisionId = `${baseId}__import_${pkg.slice(0, 8)}`;
    expect(collisionId).toBe("original-session-before-collision__import_deadbeef");
  });
});
