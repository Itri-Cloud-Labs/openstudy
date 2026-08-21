import os from 'os';
import path from 'path';
import {
  createDefaultAppPreferences,
  preferencesFromSessionSettings,
  sessionSettingsFromDomain,
  type AppPreferences,
  type ProviderConfig,
} from '../domain/index.js';
import {
  createPersistence,
  type MigrationReport,
  type OpenStudyPersistence,
} from '../infrastructure/persistence/index.js';
import type { ActiveProviderConfig } from '../domain/provider.js';
import type { SessionSettings } from '../domain/study.js';

const CONFIG_DIR = path.join(os.homedir(), '.openstudy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

const persistence = createPersistence({ rootDir: CONFIG_DIR });

const DEFAULT_SESSION: SessionSettings = sessionSettingsFromDomain(createDefaultAppPreferences(), null);

/**
 * Explicit bootstrap for versioned storage. Reads intentionally do not call
 * this function so rendering and inspection never mutate the filesystem.
 */
export function initializePersistence(): MigrationReport {
  return persistence.initialize();
}

export const migratePersistence = initializePersistence;

export function getPersistence(): OpenStudyPersistence {
  return persistence;
}

export function isFirstLaunch(): boolean {
  return persistence.isFirstLaunch();
}

export function loadSession(): SessionSettings {
  const storedPreferences = persistence.readAppPreferences();
  const preferences = storedPreferences?.preferences ?? createDefaultAppPreferences();
  const session = sessionSettingsFromDomain(preferences, persistence.readProviderConfig());

  return {
    ...session,
    createdDate: storedPreferences?.createdAt ?? null,
    lastOpenedDate: storedPreferences?.updatedAt ?? null,
  };
}

export function saveSession(session: SessionSettings): void {
  persistence.writeProviderConfig({
    provider: session.provider,
    apiKey: session.apiKey,
  });
  persistence.writeAppPreferences(preferencesFromSessionSettings(session), {
    createdAt: session.createdDate,
    updatedAt: session.lastOpenedDate,
  });
}

export function updateSettings(patch: Partial<SessionSettings>): SessionSettings {
  const current = loadSession();
  const next = { ...current, ...patch };
  const providerChanged = 'provider' in patch || 'apiKey' in patch;
  const preferencesChanged = hasPreferencesPatch(patch);

  if (providerChanged) {
    persistence.writeProviderConfig({ provider: next.provider, apiKey: next.apiKey });
  }

  if (preferencesChanged) {
    persistence.writeAppPreferences(preferencesFromSessionSettings(next), {
      createdAt: current.createdDate,
    });
  }

  return loadSession();
}

export function configExists(): boolean {
  return loadConfig() !== null;
}

export function loadConfig(): ActiveProviderConfig | null {
  const config = persistence.readProviderConfig();
  return config?.provider ? { provider: config.provider, apiKey: config.apiKey } : null;
}

export function saveConfig(config: ActiveProviderConfig): void {
  persistence.writeProviderConfig(config);
}

export function createPersistenceForRoot(
  rootDir: string,
  options: { clock?: () => Date; idGenerator?: () => string } = {},
): OpenStudyPersistence {
  return createPersistence({ rootDir, ...options });
}

function hasPreferencesPatch(patch: Partial<SessionSettings>): boolean {
  const preferenceKeys = [
    'subject',
    'modelProvider',
    'model',
    'reasoningEffort',
    'material',
    'studyLanguage',
  ] satisfies Array<keyof SessionSettings>;

  return preferenceKeys.some(key => key in patch);
}

export type { AppPreferences, ProviderConfig };
export { CONFIG_FILE, CONFIG_DIR, SESSION_FILE };
export { DEFAULT_SESSION };
