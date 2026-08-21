export const SHORTCUTS = {
  subject: { key: 'tab', input: '', tab: true, label: 'subject' },
  model: { key: 'ctrl+m', input: 'm', ctrl: true, label: 'model' },
  reasoning: { key: 'ctrl+r', input: 'r', ctrl: true, label: 'reasoning' },
  material: { key: 'ctrl+f', input: 'f', ctrl: true, label: 'material' },
  language: { key: 'ctrl+l', input: 'l', ctrl: true, label: 'language' },
  nextMode: { key: 'ctrl+l', input: 'l', ctrl: true, label: 'next mode' },
  close: { key: 'ctrl+c', input: 'c', ctrl: true, label: 'close' },
} as const;

export type ShortcutId = keyof typeof SHORTCUTS;

export function formatShortcutHints(ids: readonly ShortcutId[]): string {
  return ids.map(id => `${SHORTCUTS[id].key} ${SHORTCUTS[id].label}`).join('  ');
}
