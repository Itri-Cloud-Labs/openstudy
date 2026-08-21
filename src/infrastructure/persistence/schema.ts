import {
  asRecord,
  nonEmptyString,
  normalizeAppPreferences,
  normalizeStudySession,
  preferencesFromSessionSettings,
  providerConfigFromLegacy,
  studySessionFromSettings,
  type AppPreferences,
  type ProviderConfig,
  type StudySession,
} from '../../domain/index.js';

export const PERSISTENCE_SCHEMA_VERSION = 1 as const;

export interface ProviderConfigDocument {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  kind: 'provider-config';
  data: ProviderConfig;
  legacy?: Record<string, unknown>;
}

export interface AppPreferencesDocument {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  kind: 'app-preferences';
  createdAt: string;
  updatedAt: string;
  data: AppPreferences;
  legacy?: Record<string, unknown>;
}

export interface StudySessionDocument {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  kind: 'study-session';
  data: StudySession;
  legacy?: Record<string, unknown>;
}

export interface AppPreferencesRecord {
  preferences: AppPreferences;
  createdAt: string | null;
  updatedAt: string | null;
}

const LEGACY_SETTINGS_KEYS = new Set([
  'sessionId',
  'title',
  'summaryText',
  'createdDate',
  'lastOpenedDate',
  'provider',
  'apiKey',
  'subject',
  'modelProvider',
  'model',
  'reasoningEffort',
  'material',
  'studyLanguage',
]);

export function createProviderConfigDocument(
  config: ProviderConfig,
  legacy?: Record<string, unknown>,
): ProviderConfigDocument {
  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    kind: 'provider-config',
    data: { ...config },
    ...(legacy && Object.keys(legacy).length > 0 ? { legacy } : {}),
  };
}

export function createAppPreferencesDocument(
  record: AppPreferencesRecord,
  fallbackTimestamp: string,
  legacy?: Record<string, unknown>,
): AppPreferencesDocument {
  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    kind: 'app-preferences',
    createdAt: record.createdAt ?? fallbackTimestamp,
    updatedAt: record.updatedAt ?? record.createdAt ?? fallbackTimestamp,
    data: record.preferences,
    ...(legacy && Object.keys(legacy).length > 0 ? { legacy } : {}),
  };
}

export function createStudySessionDocument(
  session: StudySession,
  legacy?: Record<string, unknown>,
): StudySessionDocument {
  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    kind: 'study-session',
    data: session,
    ...(legacy && Object.keys(legacy).length > 0 ? { legacy } : {}),
  };
}

export function readProviderConfigValue(value: unknown): ProviderConfig | null {
  const raw = asRecord(value);
  if (raw['schemaVersion'] === PERSISTENCE_SCHEMA_VERSION && raw['kind'] === 'provider-config') {
    const data = asRecord(raw['data']);
    if (data['provider'] !== null) return providerConfigFromLegacy(data);
    return {
      provider: null,
      apiKey: typeof data['apiKey'] === 'string' ? data['apiKey'] : '',
    };
  }

  if ('schemaVersion' in raw) return null;
  return providerConfigFromLegacy(raw);
}

export function readAppPreferencesValue(value: unknown): AppPreferencesRecord | null {
  const raw = asRecord(value);
  if (raw['schemaVersion'] === PERSISTENCE_SCHEMA_VERSION && raw['kind'] === 'app-preferences') {
    return {
      preferences: normalizeAppPreferences(raw['data']),
      createdAt: nonEmptyString(raw['createdAt']),
      updatedAt: nonEmptyString(raw['updatedAt']),
    };
  }

  if ('schemaVersion' in raw || !looksLikeLegacySettings(raw)) return null;
  return {
    preferences: preferencesFromSessionSettings(raw),
    createdAt: nonEmptyString(raw['createdDate']),
    updatedAt: nonEmptyString(raw['lastOpenedDate']) ?? nonEmptyString(raw['createdDate']),
  };
}

export function readStudySessionValue(
  value: unknown,
  fallbackId: string,
  fallbackTimestamp: string,
): StudySession | null {
  const raw = asRecord(value);
  if (raw['schemaVersion'] === PERSISTENCE_SCHEMA_VERSION && raw['kind'] === 'study-session') {
    return normalizeStudySession(raw['data'], fallbackId, fallbackTimestamp);
  }

  if ('schemaVersion' in raw || !looksLikeLegacySettings(raw)) return null;
  return studySessionFromSettings(raw, fallbackId, fallbackTimestamp);
}

export function isCurrentDocument(value: unknown, kind: string): boolean {
  const raw = asRecord(value);
  return raw['schemaVersion'] === PERSISTENCE_SCHEMA_VERSION && raw['kind'] === kind;
}

export function getLegacyProviderConfig(value: unknown): ProviderConfig | null {
  const raw = asRecord(value);
  return 'schemaVersion' in raw ? null : providerConfigFromLegacy(raw);
}

export function getLegacyExtensions(value: unknown): Record<string, unknown> | undefined {
  const raw = asRecord(value);
  if ('schemaVersion' in raw) return undefined;

  const entries = Object.entries(raw).filter(
    ([key]) => !LEGACY_SETTINGS_KEYS.has(key) && key !== 'schemaVersion' && key !== 'kind',
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function looksLikeLegacySettings(raw: Record<string, unknown>): boolean {
  return [...LEGACY_SETTINGS_KEYS].some(key => key in raw);
}
