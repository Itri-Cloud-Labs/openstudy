export { isProvider, type Provider, type ProviderConfig } from './provider.js';
export { materialRefFromLegacy, materialRefToLegacy, type MaterialRef } from './material.js';
export {
  DEFAULT_SUBJECT,
  asRecord,
  createDefaultAppPreferences,
  createEmptyModeResults,
  nonEmptyString,
  normalizeAppPreferences,
  normalizeModeResults,
  normalizeStudySession,
  preferencesFromSessionSettings,
  providerConfigFromLegacy,
  sessionSettingsFromDomain,
  studySessionFromSettings,
  type AppPreferences,
  type ModeResults,
  type SessionSettings,
  type StudySession,
} from './study.js';
