import type { ModalManifest } from './types.js';
import { SHORTCUTS } from '../shared/terminal/keymap.js';

export const manifest: ModalManifest = {
  id: 'filepicker',
  Screen: 'home',
  trigger: {
    id: 'filepicker',
    key: SHORTCUTS.material.key,
    label: 'material',
    description: 'Open material picker',
    input: SHORTCUTS.material.input,
    ctrl: SHORTCUTS.material.ctrl,
  },
  load: () => import('./filepicker.js'),
};
