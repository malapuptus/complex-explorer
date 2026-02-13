export type {
  StimulusWord,
  AssociationResponse,
  Trial,
  SessionConfig,
  SessionResult,
  SessionScoring,
  TrialFlag,
  FlagKind,
  SessionSummary,
  OrderPolicy,
  ProvenanceSnapshot,
} from "./types";

export type { SessionStore, SessionListEntry, DraftSession } from "./sessionStore";

export { scoreSession } from "./scoring";

export { sessionTrialsToCsv, sessionResultsToCsv } from "./csvExport";

export type { ReflectionPrompt } from "./reflection";
export { generateReflectionPrompts } from "./reflection";

export { seededShuffle, randomSeed } from "./shuffle";

export type {
  StimulusList,
  StimulusListProvenance,
  StimulusListValidationError,
} from "./stimuli";

export {
  validateStimulusList,
  getStimulusList,
  listAvailableStimulusLists,
} from "./stimuli";
