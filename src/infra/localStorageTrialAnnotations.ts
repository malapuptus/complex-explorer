/**
 * localStorageTrialAnnotations — per-trial human-judgment tags and notes.
 * Patterned after localStorageUiPrefs.ts. Ticket 0279.
 *
 * Storage key: complex-mapper-trial-annotations
 * Shape: { [sessionId]: { [trialIndex]: TrialAnnotation } }
 */

export type SelfTagCode = "DR" | "M" | "Med" | "S";

export const SELF_TAG_LABELS: Record<SelfTagCode, string> = {
  DR:  "Distant response",
  M:   "Multimodal",
  Med: "Medical/clinical",
  S:   "Superficial",
};

export const SELF_TAG_ORDER: SelfTagCode[] = ["DR", "M", "Med", "S"];

export interface TrialAnnotation {
  tags: SelfTagCode[];
  note: string;
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
  const isEmpty = annotation.tags.length === 0 && annotation.note.trim() === "";
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

export const trialAnnotations = {
  getAnnotation,
  setAnnotation,
  getSessionAnnotations,
  getAnnotationSummary,
};
