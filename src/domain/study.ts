import { materialRefFromLegacy, type MaterialRef } from './material.js';
import { isProvider, type Provider } from './provider.js';

export const DEFAULT_SUBJECT = 'General';

export interface AppPreferences {
  subject: string;
  modelProvider: Provider | null;
  model: string | null;
  reasoningEffort: string | null;
  material: MaterialRef | null;
  studyLanguage: string | null;
}

export interface ModeResults {
  summary: string | null;
  quiz: unknown | null;
  flashCards: unknown | null;
  exercises: unknown | null;
  aiTeacher: unknown | null;
}

export interface StudySession {
  id: string;
  title: string | null;
  createdAt: string;
  lastOpenedAt: string;
  preferences: AppPreferences;
  modeResults: ModeResults;
}

export function createDefaultAppPreferences(): AppPreferences {
  return {
    subject: DEFAULT_SUBJECT,
    modelProvider: null,
    model: null,
    reasoningEffort: null,
    material: null,
    studyLanguage: null,
  };
}

export function createEmptyModeResults(): ModeResults {
  return {
    summary: null,
    quiz: null,
    flashCards: null,
    exercises: null,
    aiTeacher: null,
  };
}

export function normalizeAppPreferences(value: unknown): AppPreferences {
  const raw = asRecord(value);
  const defaults = createDefaultAppPreferences();

  return {
    subject: nonEmptyString(raw['subject']) ?? defaults.subject,
    modelProvider: isProvider(raw['modelProvider']) ? raw['modelProvider'] : null,
    model: nonEmptyString(raw['model']),
    reasoningEffort: nonEmptyString(raw['reasoningEffort']),
    material: normalizeMaterialRef(raw['material']),
    studyLanguage: nonEmptyString(raw['studyLanguage']),
  };
}

export function normalizeModeResults(value: unknown): ModeResults {
  const raw = asRecord(value);
  const summary = raw['summary'];

  return {
    summary: typeof summary === 'string' ? summary : null,
    quiz: raw['quiz'] ?? null,
    flashCards: raw['flashCards'] ?? null,
    exercises: raw['exercises'] ?? null,
    aiTeacher: raw['aiTeacher'] ?? null,
  };
}

export function normalizeStudySession(value: unknown, fallbackId: string, fallbackTimestamp: string): StudySession {
  const raw = asRecord(value);
  const createdAt = nonEmptyString(raw['createdAt']) ?? fallbackTimestamp;

  return {
    id: nonEmptyString(raw['id']) ?? fallbackId,
    title: nonEmptyString(raw['title']),
    createdAt,
    lastOpenedAt: nonEmptyString(raw['lastOpenedAt']) ?? createdAt,
    preferences: normalizeAppPreferences(raw['preferences']),
    modeResults: normalizeModeResults(raw['modeResults']),
  };
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeMaterialRef(value: unknown): MaterialRef | null {
  if (typeof value === 'string') return materialRefFromLegacy(value);

  const raw = asRecord(value);
  if (raw['kind'] === 'file') {
    const filePath = nonEmptyString(raw['path']);
    return filePath ? { kind: 'file', path: filePath } : null;
  }

  if (raw['kind'] === 'url') {
    const url = nonEmptyString(raw['url']);
    return url ? { kind: 'url', url } : null;
  }

  return null;
}
