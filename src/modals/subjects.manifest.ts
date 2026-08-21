import type { ModalManifest } from './types.js';
import { SHORTCUTS } from '../shared/terminal/keymap.js';

export const manifest: ModalManifest = {
  id: 'subjects',
  Screen: 'home',
  trigger: {
    id: 'subjects',
    key: SHORTCUTS.subject.key,
    label: 'subject',
    description: 'Open subject selector',
    tab: true,
  },
  load: () => import('./subjects.js'),
};
