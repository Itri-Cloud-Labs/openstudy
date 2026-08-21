import fs from 'fs';
import { randomUUID } from 'crypto';
import {
  createDefaultAppPreferences,
  createEmptyModeResults,
  type AppPreferences,
  type ProviderConfig,
  type StudySession,
} from '../../domain/index.js';
import { readJson, writeJsonAtomic } from './json.js';
import { createPersistencePaths, isUuidDirectoryName, type PersistencePaths } from './paths.js';
import {
  createAppPreferencesDocument,
  createProviderConfigDocument,
  createStudySessionDocument,
  getLegacyExtensions,
  getLegacyProviderConfig,
  isCurrentDocument,
  readAppPreferencesValue,
  readProviderConfigValue,
  readStudySessionValue,
  type AppPreferencesRecord,
} from './schema.js';

export interface PersistenceOptions {
  rootDir: string;
  clock?: () => Date;
  idGenerator?: () => string;
}

export interface MigrationReport {
  migrated: string[];
  skipped: string[];
  errors: Array<{ path: string; message: string }>;
}

export interface CreateStudySessionInput {
  title?: string | null;
  preferences: AppPreferences;
  modeResults?: StudySession['modeResults'];
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

  /** Reads never create directories, migrate files, or update timestamps. */
  readProviderConfig(): ProviderConfig | null {
    const config = readJson(this.paths.providerConfig);
    if (config.status === 'ready') {
      const decoded = readProviderConfigValue(config.value);
      if (decoded) return decoded;
    }

    const preferences = readJson(this.paths.appPreferences);
    return preferences.status === 'ready' ? getLegacyProviderConfig(preferences.value) : null;
  }

  readAppPreferences(): AppPreferencesRecord | null {
    const result = readJson(this.paths.appPreferences);
    return result.status === 'ready' ? readAppPreferencesValue(result.value) : null;
  }

  readStudySession(sessionId: string): StudySession | null {
    const result = readJson(this.paths.sessionFile(sessionId));
    return result.status === 'ready' ? readStudySessionValue(result.value, sessionId, new Date(0).toISOString()) : null;
  }

  readLegacySessionProviderConfig(sessionId: string): ProviderConfig | null {
    const result = readJson(this.paths.sessionFile(sessionId));
    return result.status === 'ready' ? getLegacyProviderConfig(result.value) : null;
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
    writeJsonAtomic(this.paths.providerConfig, createProviderConfigDocument(config));
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

    writeJsonAtomic(this.paths.appPreferences, createAppPreferencesDocument(record, now));
    return record;
  }

  writeStudySession(session: StudySession): StudySession {
    const canonical = {
      ...session,
      preferences: { ...session.preferences },
      modeResults: { ...session.modeResults },
    };
    writeJsonAtomic(this.paths.sessionFile(session.id), createStudySessionDocument(canonical));
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
      modeResults: { ...(input.modeResults ?? createEmptyModeResults()) },
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

  /** Explicit, idempotent in-place migration. */
  initialize(): MigrationReport {
    const report: MigrationReport = { migrated: [], skipped: [], errors: [] };
    fs.mkdirSync(this.paths.root, { recursive: true });

    this.migrateProviderConfig(report);
    this.migrateAppPreferences(report);
    this.migrateStudySessions(report);

    return report;
  }

  private migrateProviderConfig(report: MigrationReport): void {
    const existing = readJson(this.paths.providerConfig);
    if (existing.status === 'ready' && isCurrentDocument(existing.value, 'provider-config')) {
      report.skipped.push(this.paths.providerConfig);
      return;
    }
    if (existing.status === 'invalid') {
      report.errors.push({ path: this.paths.providerConfig, message: existing.error.message });
      return;
    }

    let source = existing.status === 'ready' ? existing.value : undefined;
    let config = source === undefined ? null : getLegacyProviderConfig(source);

    if (!config) {
      const legacyPreferences = readJson(this.paths.appPreferences);
      if (legacyPreferences.status === 'ready') {
        source = legacyPreferences.value;
        config = getLegacyProviderConfig(source);
      }
    }

    if (!config) return;

    writeJsonAtomic(this.paths.providerConfig, createProviderConfigDocument(config, getLegacyExtensions(source)));
    report.migrated.push(this.paths.providerConfig);
  }

  private migrateAppPreferences(report: MigrationReport): void {
    const existing = readJson(this.paths.appPreferences);
    if (existing.status === 'missing') return;
    if (existing.status === 'invalid') {
      report.errors.push({ path: this.paths.appPreferences, message: existing.error.message });
      return;
    }
    if (isCurrentDocument(existing.value, 'app-preferences')) {
      report.skipped.push(this.paths.appPreferences);
      return;
    }

    const record = readAppPreferencesValue(existing.value);
    if (!record) {
      report.errors.push({
        path: this.paths.appPreferences,
        message: 'Unrecognized app preferences schema; file was left unchanged.',
      });
      return;
    }

    writeJsonAtomic(
      this.paths.appPreferences,
      createAppPreferencesDocument(record, this.now(), getLegacyExtensions(existing.value)),
    );
    report.migrated.push(this.paths.appPreferences);
  }

  private migrateStudySessions(report: MigrationReport): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(this.paths.root, { withFileTypes: true });
    } catch (error) {
      report.errors.push({
        path: this.paths.root,
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !isUuidDirectoryName(entry.name)) continue;
      this.migrateStudySession(entry.name, report);
    }
  }

  private migrateStudySession(sessionId: string, report: MigrationReport): void {
    const pathname = this.paths.sessionFile(sessionId);
    const existing = readJson(pathname);
    if (existing.status === 'missing') return;
    if (existing.status === 'invalid') {
      report.errors.push({ path: pathname, message: existing.error.message });
      return;
    }
    if (isCurrentDocument(existing.value, 'study-session')) {
      report.skipped.push(pathname);
      return;
    }

    const session = readStudySessionValue(existing.value, sessionId, this.now());
    if (!session) {
      report.errors.push({
        path: pathname,
        message: 'Unrecognized study session schema; file was left unchanged.',
      });
      return;
    }

    const legacyConfig = getLegacyProviderConfig(existing.value);
    const centralConfig = this.readProviderConfig();
    if (
      legacyConfig?.apiKey &&
      (!centralConfig ||
        centralConfig.provider !== legacyConfig.provider ||
        centralConfig.apiKey !== legacyConfig.apiKey)
    ) {
      if (!centralConfig && readJson(this.paths.providerConfig).status === 'missing') {
        this.writeProviderConfig(legacyConfig);
        report.migrated.push(this.paths.providerConfig);
      } else {
        report.errors.push({
          path: pathname,
          message:
            'Session credentials differ from provider config; legacy file was left unchanged to avoid data loss.',
        });
        return;
      }
    }

    writeJsonAtomic(pathname, createStudySessionDocument(session, getLegacyExtensions(existing.value)));
    report.migrated.push(pathname);
  }

  private now(): string {
    return this.clock().toISOString();
  }
}

export function createPersistence(options: PersistenceOptions): OpenStudyPersistence {
  return new OpenStudyPersistence(options);
}

export function defaultPreferences(): AppPreferences {
  return createDefaultAppPreferences();
}
