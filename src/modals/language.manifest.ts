import type { ModalManifest } from './types.js';
import { SHORTCUTS } from '../shared/terminal/keymap.js';

export const manifest: ModalManifest = {
  id: 'language',
  Screen: 'home',
  trigger: {
    id: 'language',
    key: SHORTCUTS.language.key,
    label: 'language',
    description: 'Open language selector',
    input: SHORTCUTS.language.input,
    ctrl: SHORTCUTS.language.ctrl,
  },
  load: () => import('./language.js'),
};
