import path from 'path';
import {
  preferencesFromSessionSettings,
  sessionSettingsFromDomain,
  studySessionFromSettings,
  type StudySession,
} from '../domain/index.js';
import type { SessionSettings } from '../types/index.js';
import { CONFIG_DIR, DEFAULT_SESSION, getPersistence, loadSession, saveSession } from './config.js';

const SESSION_FILENAME = 'session.json';

export function getSessionDirectory(sessionId: string): string {
  return path.join(CONFIG_DIR, sessionId);
}

export function getSessionFilePath(sessionId: string): string {
  return path.join(getSessionDirectory(sessionId), SESSION_FILENAME);
}

export function getAllSession(): SessionSettings[] {
  const persistence = getPersistence();
  const providerConfig = persistence.readProviderConfig();

  return persistence
    .listStudySessions()
    .map(session => sessionSettingsFromDomain(session.preferences, providerConfig, session));
}

export function getSessionById(sessionId: string): SessionSettings | null {
  const persistence = getPersistence();
  const session = persistence.readStudySession(sessionId);
  if (!session) return null;

  const providerConfig = persistence.readProviderConfig() ?? persistence.readLegacySessionProviderConfig(sessionId);
  return sessionSettingsFromDomain(session.preferences, providerConfig, session);
}

export function saveSessionById(sessionId: string, session: SessionSettings): SessionSettings {
  const persistence = getPersistence();
  const current = persistence.readStudySession(sessionId);
  const timestamp = new Date().toISOString();
  const domainSession = studySessionFromSettings({ ...session, sessionId }, sessionId, current?.createdAt ?? timestamp);
  const saved = persistence.writeStudySession({
    ...domainSession,
    createdAt: session.createdDate ?? current?.createdAt ?? domainSession.createdAt,
    lastOpenedAt: session.lastOpenedDate ?? current?.lastOpenedAt ?? domainSession.lastOpenedAt,
    modeResults: {
      ...(current?.modeResults ?? domainSession.modeResults),
      summary: session.summaryText,
    },
  });

  return sessionSettingsFromDomain(
    saved.preferences,
    persistence.readProviderConfig() ?? {
      provider: session.provider,
      apiKey: session.apiKey,
    },
    saved,
  );
}

export function createSession(session: SessionSettings = DEFAULT_SESSION): SessionSettings {
  const persistence = getPersistence();
  const homeSession = loadSession();
  const merged = { ...DEFAULT_SESSION, ...homeSession, ...session };
  const created = persistence.createStudySession({
    title: null,
    preferences: preferencesFromSessionSettings(merged),
  });

  return sessionSettingsFromDomain(
    created.preferences,
    persistence.readProviderConfig() ?? {
      provider: merged.provider,
      apiKey: merged.apiKey,
    },
    created,
  );
}

export function setSession(sessionId: string): SessionSettings | null {
  const persistence = getPersistence();
  const updated = persistence.touchStudySession(sessionId);
  if (!updated) return null;

  const providerConfig = persistence.readProviderConfig() ?? persistence.readLegacySessionProviderConfig(sessionId);
  const compatibilitySession = sessionSettingsFromDomain(updated.preferences, providerConfig, updated);

  saveSession(compatibilitySession);
  return compatibilitySession;
}

export function saveDomainSession(session: StudySession): StudySession {
  return getPersistence().writeStudySession(session);
}
