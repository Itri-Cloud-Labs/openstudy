import os from 'os';
import path from 'path';
import {
  createDefaultAppPreferences,
  type ActiveProviderConfig,
  type AppPreferences,
  type ProviderConfig,
} from '../domain/index.js';
import { createPersistence, type OpenStudyPersistence } from '../infrastructure/persistence/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.openstudy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

const persistence = createPersistence({ rootDir: CONFIG_DIR });

export function getPersistence(): OpenStudyPersistence {
  return persistence;
}

export function isFirstLaunch(): boolean {
  return persistence.isFirstLaunch();
}

export function loadAppPreferences(): AppPreferences {
  return persistence.readAppPreferences()?.preferences ?? createDefaultAppPreferences();
}

export function saveAppPreferences(preferences: AppPreferences): void {
  persistence.writeAppPreferences(preferences);
}

export function updatePreferences(patch: Partial<AppPreferences>): AppPreferences {
  const next = { ...loadAppPreferences(), ...patch };
  const hasPreferencePatch = Object.keys(patch).length > 0;

  if (hasPreferencePatch) {
    persistence.writeAppPreferences(next);
  }

  return next;
}

export function loadConfig(): ActiveProviderConfig | null {
  const config = persistence.readProviderConfig();
  return config?.provider ? { provider: config.provider, apiKey: config.apiKey } : null;
}

export function saveConfig(config: ActiveProviderConfig): void {
  persistence.writeProviderConfig(config);
}

export type { AppPreferences, ProviderConfig };
export { CONFIG_FILE, CONFIG_DIR, SESSION_FILE };
