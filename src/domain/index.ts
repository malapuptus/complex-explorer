export type {
  StimulusWord,
  AssociationResponse,
  Trial,
  SessionConfig,
  SessionResult,
  SessionContext,
  SessionScoring,
  TrialFlag,
  FlagKind,
  SessionSummary,
  OrderPolicy,
  ProvenanceSnapshot,
  StimulusPackSnapshot,
} from "./types";


export type { SessionStore, SessionListEntry, DraftSession, DraftLock } from "./sessionStore";
export { DRAFT_LOCK_TTL_MS } from "./sessionStore";

export { scoreSession } from "./scoring";

export { sessionTrialsToCsv, sessionResultsToCsv, CSV_SCHEMA_VERSION } from "./csvExport";
export type { CsvExportOptions } from "./csvExport";

export { computeSessionFingerprint } from "./fingerprint";

export type { ReflectionPrompt } from "./reflection";
export { generateReflectionPrompts } from "./reflection";

export { seededShuffle, randomSeed } from "./shuffle";

export type { StimulusList, StimulusListProvenance, StimulusListValidationError, ValidationErrorCode } from "./stimuli";

export {
  validateStimulusList,
  getStimulusList,
  listAvailableStimulusLists,
  STIMULUS_SCHEMA_VERSION,
  computeWordsSha256,
} from "./stimuli";

export { buildSessionContext, detectDeviceClass, detectOsFamily, detectBrowserFamily, sumCompositionCount } from "./sessionContext";

export type { SessionInsights, TrialRef, TimelinePoint, QualityIndex } from "./sessionInsights";
export { buildSessionInsights, computeQualityIndex, getMicroGoal } from "./sessionInsights";

export { simulateSession } from "./simulateSession";

export {
  getResponseText,
  getResponseLen,
  getTimedOut,
  getBackspaces,
  getEdits,
  getCompositions,
  getFirstKeyMs,
} from "./trialFields";

export type { CiCode } from "./ciCodes";
export { computeCiCodesForTrial, aggregateCiCounts, CI_CODE_ORDER, CI_CODE_LABELS } from "./ciCodes";
