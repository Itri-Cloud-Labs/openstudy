import type { ModalManifest } from './types.js';
import { SHORTCUTS } from '../shared/terminal/keymap.js';

export const manifest: ModalManifest = {
  id: 'devtools',
  Screen: null,
  trigger: {
    id: 'devtools',
    key: SHORTCUTS.devtools.key,
    label: 'dev tools',
    description: 'Open developer tools',
    input: SHORTCUTS.devtools.input,
    ctrl: SHORTCUTS.devtools.ctrl,
  },
  load: () => import('./devtools.js'),
};
