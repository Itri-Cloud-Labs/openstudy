import type { ModalManifest } from './types.js';
import { SHORTCUTS } from '../shared/terminal/keymap.js';

export const manifest: ModalManifest = {
  id: 'models',
  Screen: 'home',
  trigger: {
    id: 'models',
    key: SHORTCUTS.model.key,
    label: 'model',
    description: 'Open model selector',
    input: SHORTCUTS.model.input,
    ctrl: SHORTCUTS.model.ctrl,
  },
  load: () => import('./models.js'),
};
