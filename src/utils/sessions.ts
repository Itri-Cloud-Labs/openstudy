import { createEmptyModeResults, type AppPreferences, type StudySession } from '../domain/index.js';
import { CONFIG_DIR, getPersistence, loadAppPreferences, saveAppPreferences } from './config.js';

export function getAllSessions(): StudySession[] {
  return getPersistence()
    .listStudySessions()
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

export function getSessionById(sessionId: string): StudySession | null {
  return getPersistence().readStudySession(sessionId);
}

export function saveSessionResult(
  sessionId: string,
  result: { title?: string; summary?: string },
): StudySession | null {
  const persistence = getPersistence();
  const current = persistence.readStudySession(sessionId);
  if (!current) return null;

  return persistence.writeStudySession({
    ...current,
    title: result.title ?? current.title,
    modeResults: {
      ...current.modeResults,
      summary: result.summary ?? current.modeResults.summary,
    },
  });
}

export function createSession(preferences: AppPreferences = loadAppPreferences()): StudySession {
  return getPersistence().createStudySession({ title: null, preferences });
}

export function activateSession(sessionId: string): StudySession | null {
  const updated = getPersistence().touchStudySession(sessionId);
  if (!updated) return null;

  saveAppPreferences(updated.preferences);
  return updated;
}
