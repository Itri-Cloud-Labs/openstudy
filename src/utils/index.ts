/**
 * Utility functions for openStudy
 */

export {
  createPersistenceForRoot,
  getPersistence,
  initializePersistence,
  isFirstLaunch,
  loadConfig,
  loadSession,
  migratePersistence,
  saveConfig,
  saveSession,
  updateSettings,
} from './config.js';
export { focusTextColor } from './colors.js';
export {
  createSession,
  getAllSession,
  getSessionById,
  getSessionDirectory,
  getSessionFilePath,
  saveDomainSession,
  saveSessionById,
  setSession,
} from './sessions.js';
