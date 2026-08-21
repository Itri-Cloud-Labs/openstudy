import fs from 'fs';
import { randomUUID } from 'crypto';
import {
  asRecord,
  createEmptyModeResults,
  isProvider,
  normalizeAppPreferences,
  normalizeStudySession,
  nonEmptyString,
  type AppPreferences,
  type ProviderConfig,
  type StudySession,
} from '../../domain/index.js';
import { readJson, writeJsonAtomic } from './json.js';
import { createPersistencePaths, type PersistencePaths } from './paths.js';

export interface PersistenceOptions {
  rootDir: string;
  clock?: () => Date;
  idGenerator?: () => string;
}

export interface CreateStudySessionInput {
  title?: string | null;
  preferences: AppPreferences;
  modeResults?: StudySession['modeResults'];
}

export interface AppPreferencesRecord {
  preferences: AppPreferences;
  createdAt: string | null;
  updatedAt: string | null;
}

export class OpenStudyPersistence {
  readonly paths: PersistencePaths;
  private readonly clock: () => Date;
  private readonly idGenerator: () => string;

  constructor(options: PersistenceOptions) {
    this.paths = createPersistencePaths(options.rootDir);
    this.clock = options.clock ?? (() => new Date());
    this.idGenerator = options.idGenerator ?? randomUUID;
  }

  /** Reads never create directories or update timestamps. */
  readProviderConfig(): ProviderConfig | null {
    const result = readJson(this.paths.providerConfig);
    if (result.status !== 'ready') return null;

    const raw = asRecord(result.value);
    if (Object.keys(raw).length === 0) return null;
    return {
      provider: isProvider(raw['provider']) ? raw['provider'] : null,
      apiKey: typeof raw['apiKey'] === 'string' ? raw['apiKey'] : '',
    };
  }

  readAppPreferences(): AppPreferencesRecord | null {
    const result = readJson(this.paths.appPreferences);
    if (result.status !== 'ready') return null;

    const raw = asRecord(result.value);
    if (typeof raw['preferences'] !== 'object' || raw['preferences'] === null) return null;

    return {
      preferences: normalizeAppPreferences(raw['preferences']),
      createdAt: nonEmptyString(raw['createdAt']),
      updatedAt: nonEmptyString(raw['updatedAt']),
    };
  }

  readStudySession(sessionId: string): StudySession | null {
    const result = readJson(this.paths.sessionFile(sessionId));
    if (result.status !== 'ready') return null;

    const raw = asRecord(result.value);
    if (!raw['id']) return null;
    return normalizeStudySession(raw, sessionId, new Date(0).toISOString());
  }

  listStudySessions(): StudySession[] {
    if (!fs.existsSync(this.paths.root)) return [];

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(this.paths.root, { withFileTypes: true });
    } catch {
      return [];
    }

    return entries
      .filter(entry => entry.isDirectory() && entry.name !== 'documents')
      .map(entry => this.readStudySession(entry.name))
      .filter((session): session is StudySession => session !== null);
  }

  writeProviderConfig(config: ProviderConfig): ProviderConfig {
    writeJsonAtomic(this.paths.providerConfig, config);
    return { ...config };
  }

  writeAppPreferences(
    preferences: AppPreferences,
    metadata: Partial<Pick<AppPreferencesRecord, 'createdAt' | 'updatedAt'>> = {},
  ): AppPreferencesRecord {
    const current = this.readAppPreferences();
    const now = this.now();
    const record: AppPreferencesRecord = {
      preferences,
      createdAt: metadata.createdAt ?? current?.createdAt ?? now,
      updatedAt: metadata.updatedAt ?? now,
    };

    writeJsonAtomic(this.paths.appPreferences, record);
    return record;
  }

  writeStudySession(session: StudySession): StudySession {
    const canonical = {
      ...session,
      preferences: { ...session.preferences },
      modeResults: { ...session.modeResults },
    };
    writeJsonAtomic(this.paths.sessionFile(session.id), canonical);
    return canonical;
  }

  createStudySession(input: CreateStudySessionInput): StudySession {
    const timestamp = this.now();
    const session: StudySession = {
      id: this.idGenerator(),
      title: input.title ?? null,
      createdAt: timestamp,
      lastOpenedAt: timestamp,
      preferences: { ...input.preferences },
      modeResults: input.modeResults ? { ...input.modeResults } : createEmptyModeResults(),
    };

    return this.writeStudySession(session);
  }

  touchStudySession(sessionId: string): StudySession | null {
    const session = this.readStudySession(sessionId);
    if (!session) return null;
    return this.writeStudySession({ ...session, lastOpenedAt: this.now() });
  }

  /**
   * True only when no valid OpenStudy state exists. An empty directory or a
   * documents-only directory is still a first launch.
   */
  isFirstLaunch(): boolean {
    if (this.readProviderConfig() || this.readAppPreferences()) return false;
    return this.listStudySessions().length === 0;
  }

  private now(): string {
    return this.clock().toISOString();
  }
}

export function createPersistence(options: PersistenceOptions): OpenStudyPersistence {
  return new OpenStudyPersistence(options);
}
