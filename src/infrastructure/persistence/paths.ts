import path from 'path';

export const PROVIDER_CONFIG_FILENAME = 'config.json';
export const APP_PREFERENCES_FILENAME = 'session.json';
export const STUDY_SESSION_FILENAME = 'session.json';
export const DOCUMENTS_DIRECTORY_NAME = 'documents';

export interface PersistencePaths {
  root: string;
  providerConfig: string;
  appPreferences: string;
  documents: string;
  sessionDirectory: (sessionId: string) => string;
  sessionFile: (sessionId: string) => string;
}

export function createPersistencePaths(rootDir: string): PersistencePaths {
  const root = path.resolve(rootDir);

  return {
    root,
    providerConfig: path.join(root, PROVIDER_CONFIG_FILENAME),
    appPreferences: path.join(root, APP_PREFERENCES_FILENAME),
    documents: path.join(root, DOCUMENTS_DIRECTORY_NAME),
    sessionDirectory: sessionId => path.join(root, assertSafeSessionId(sessionId)),
    sessionFile: sessionId => path.join(root, assertSafeSessionId(sessionId), STUDY_SESSION_FILENAME),
  };
}

export function isUuidDirectoryName(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function assertSafeSessionId(sessionId: string): string {
  if (
    !sessionId ||
    sessionId === '.' ||
    sessionId === '..' ||
    sessionId.includes('/') ||
    sessionId.includes('\\') ||
    sessionId.includes('\0')
  ) {
    throw new Error('Invalid study session id.');
  }

  return sessionId;
}
