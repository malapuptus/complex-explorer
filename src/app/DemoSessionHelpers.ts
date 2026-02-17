/**
 * DemoSessionHelpers — constants and utilities extracted from DemoSession.
 * Pure helpers with no React dependencies.
 */

import { listAvailableStimulusLists } from "@/domain";

export const PRACTICE_WORDS = ["sun", "table", "road"];
export const DEFAULT_BREAK_EVERY = 20;

export interface PackOption {
  id: string;
  version: string;
  label: string;
  wordCount: number;
  estimate: string;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function estimateDuration(wordCount: number): string {
  const loMin = Math.max(1, Math.round((wordCount * 3) / 60));
  const hiMin = Math.max(1, Math.round((wordCount * 7) / 60));
  if (loMin === hiMin) return `~${loMin} min`;
  return `~${loMin}–${hiMin} min`;
}

export function buildPackOptions(): PackOption[] {
  return listAvailableStimulusLists().map((meta) => ({
    id: meta.id,
    version: meta.version,
    label:
      meta.id === "demo-10"
        ? `Demo (${meta.wordCount} words)`
        : `${meta.source} (${meta.wordCount} words)`,
    wordCount: meta.wordCount,
    estimate: estimateDuration(meta.wordCount),
  }));
}
