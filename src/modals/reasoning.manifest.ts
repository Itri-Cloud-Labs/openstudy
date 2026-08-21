import type { ModalManifest } from './types.js';
import { SHORTCUTS } from '../shared/terminal/keymap.js';

export const manifest: ModalManifest = {
  id: 'reasoning',
  Screen: 'home',
  trigger: {
    id: 'reasoning',
    key: SHORTCUTS.reasoning.key,
    label: 'reasoning',
    description: 'Open reasoning selector',
    input: SHORTCUTS.reasoning.input,
    ctrl: SHORTCUTS.reasoning.ctrl,
  },
  load: () => import('./reasoning.js'),
};
