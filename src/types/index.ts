// Re-export all shared types for convenient imports
export type {
  SiteAdapter,
  PageInfo,
  DataDomain,
  RawExtractedData,
  ExtractionMetadata,
  RawSection,
  RawField,
} from '../adapters/types';

export type {
  NormalisationResult,
  NormalisationError,
  NormalisationWarning,
  NormalisationSummary,
  CreditFilePayload,
  NormaliserConfig,
  NormaliserInput,
} from '../normalizer/types';

export type {
  ExtensionStatus,
} from '../utils/messaging';

export type {
  ConnectionSettings,
  UserPreferences,
  ScrapeHistoryEntry,
} from '../utils/storage';

export type {
  ExtractionState,
  ExtractionJob,
  HtmlArtifact,
} from '../extraction/types';
