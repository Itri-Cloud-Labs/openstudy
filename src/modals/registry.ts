import { manifest as filepicker } from './filepicker.manifest.js';
import { manifest as language } from './language.manifest.js';
import { manifest as message } from './message.manifest.js';
import { manifest as models } from './models.manifest.js';
import { manifest as reasoning } from './reasoning.manifest.js';
import { manifest as sessions } from './sessions.manifest.js';
import { manifest as subjects } from './subjects.manifest.js';
import type { ModalId, ModalManifest, ModalModule } from './types.js';

export const MODAL_REGISTRY = [
  filepicker,
  language,
  message,
  models,
  reasoning,
  sessions,
  subjects,
] as const satisfies readonly ModalManifest[];

const moduleCache = new Map<ModalId, Promise<ModalModule>>();

export async function loadModalManifests(): Promise<ModalManifest[]> {
  return [...MODAL_REGISTRY];
}

export function getModalManifest(id: ModalId): ModalManifest | null {
  return MODAL_REGISTRY.find(manifest => manifest.id === id) ?? null;
}

export async function loadModalModule(id: ModalId): Promise<ModalModule | null> {
  const manifest = getModalManifest(id);
  if (!manifest) return null;

  let pending = moduleCache.get(id);
  if (!pending) {
    pending = manifest.load();
    moduleCache.set(id, pending);
  }

  return pending;
}
