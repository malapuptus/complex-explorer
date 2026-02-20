/**
 * localStorageTrialAnnotations — per-trial human-judgment tags and notes.
 * Patterned after localStorageUiPrefs.ts. Ticket 0279.
 * Updated 0285: expanded manual indicator tags (B, DR, M, Med, Fl, So, S)
 * with source: "manual" metadata.
 *
 * Storage key: complex-mapper-trial-annotations
 * Shape: { [sessionId]: { [trialIndex]: TrialAnnotation } }
 */

// ── Self-tags (0279) ──────────────────────────────────────────────────

export type SelfTagCode = "DR" | "M" | "Med" | "S";

export const SELF_TAG_LABELS: Record<SelfTagCode, string> = {
  DR:  "Distant response",
  M:   "Multimodal",
  Med: "Medical/clinical",
  S:   "Superficial",
};

export const SELF_TAG_ORDER: SelfTagCode[] = ["DR", "M", "Med", "S"];

// ── Manual indicator tags (0285) ──────────────────────────────────────

/**
 * Manual indicator codes that require human observation.
 * These cannot be auto-detected from timing/response data alone.
 *
 *   B   — Blocking / long pause with no keystrokes
 *   DR  — Distant response
 *   M   — Multimodal (non-verbal response observed)
 *   Med — Medical/clinical reference
 *   Fl  — Flippant / dismissive response
 *   So  — Social reference
 *   S   — Superficial association
 */
export type ManualIndicatorCode = "B" | "DR" | "M" | "Med" | "Fl" | "So" | "S";

export const MANUAL_INDICATOR_LABELS: Record<ManualIndicatorCode, string> = {
  B:   "Blocking",
  DR:  "Distant response",
  M:   "Multimodal",
  Med: "Medical/clinical",
  Fl:  "Flippant",
  So:  "Social reference",
  S:   "Superficial",
};

export const MANUAL_INDICATOR_ORDER: ManualIndicatorCode[] = [
  "B", "DR", "M", "Med", "Fl", "So", "S",
];

export const MANUAL_INDICATOR_EXPLANATIONS: Record<ManualIndicatorCode, string> = {
  B:   "Participant appeared to block — no response attempted despite time remaining.",
  DR:  "Response is meaningfully distant from the stimulus (unusual association).",
  M:   "Participant gave a non-verbal or multimodal response during the trial.",
  Med: "Response involves a medical or clinical term or context.",
  Fl:  "Response was dismissive, joke-like, or flippant rather than genuine.",
  So:  "Response references a social relationship or interpersonal context.",
  S:   "Response is a shallow/surface-level association with no apparent depth.",
};

// ── Annotation shape ──────────────────────────────────────────────────

export interface TrialAnnotation {
  /** Self-tags from 0279 (legacy subset of manual indicators). */
  tags: SelfTagCode[];
  /** Free-text observer note. */
  note: string;
  /**
   * 0285: Extended manual indicator tags (superset).
   * Source is always "manual" — never auto-detected.
   */
  manualIndicators?: ManualIndicatorCode[];
  /** T0254: Emotion tags (multi-select). */
  emotions?: string[];
  /** T0254: Candidate complex labels (multi-select). */
  candidateComplexes?: string[];
  /** T0256: Jung/Riklin association type tags (multi-select). */
  associationTypes?: string[];
}

type AnnotationStore = Record<string, Record<number, TrialAnnotation>>;

const STORAGE_KEY = "complex-mapper-trial-annotations";

function readStore(): AnnotationStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AnnotationStore;
  } catch {
    return {};
  }
}

function writeStore(store: AnnotationStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded — silently ignore
  }
}

/** Get the annotation for a specific trial (or null if absent). */
function getAnnotation(sessionId: string, trialIndex: number): TrialAnnotation | null {
  const store = readStore();
  return store[sessionId]?.[trialIndex] ?? null;
}

/** Save (or remove if empty) an annotation for a specific trial. */
function setAnnotation(
  sessionId: string,
  trialIndex: number,
  annotation: TrialAnnotation,
): void {
  const store = readStore();
  const isEmpty =
    annotation.tags.length === 0 &&
    annotation.note.trim() === "" &&
    (annotation.manualIndicators?.length ?? 0) === 0 &&
    (annotation.emotions?.length ?? 0) === 0 &&
    (annotation.candidateComplexes?.length ?? 0) === 0 &&
    (annotation.associationTypes?.length ?? 0) === 0;
  if (isEmpty) {
    if (store[sessionId]) {
      delete store[sessionId][trialIndex];
      if (Object.keys(store[sessionId]).length === 0) {
        delete store[sessionId];
      }
    }
  } else {
    if (!store[sessionId]) store[sessionId] = {};
    store[sessionId][trialIndex] = annotation;
  }
  writeStore(store);
}

/** Get all annotations for a session (as a Record<trialIndex, TrialAnnotation>). */
function getSessionAnnotations(
  sessionId: string,
): Record<number, TrialAnnotation> {
  return readStore()[sessionId] ?? {};
}

/** Summary counts per self-tag code for a session (for export). */
function getAnnotationSummary(
  sessionId: string,
): Partial<Record<SelfTagCode, number>> {
  const all = getSessionAnnotations(sessionId);
  const counts: Partial<Record<SelfTagCode, number>> = {};
  for (const ann of Object.values(all)) {
    for (const tag of ann.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * 0285: Summary counts per manual indicator for a session.
 * Used in exports to convey observer-coded data.
 */
function getManualIndicatorSummary(
  sessionId: string,
): Partial<Record<ManualIndicatorCode, number>> {
  const all = getSessionAnnotations(sessionId);
  const counts: Partial<Record<ManualIndicatorCode, number>> = {};
  for (const ann of Object.values(all)) {
    for (const code of (ann.manualIndicators ?? [])) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

export const trialAnnotations = {
  getAnnotation,
  setAnnotation,
  getSessionAnnotations,
  getAnnotationSummary,
  getManualIndicatorSummary,
};
