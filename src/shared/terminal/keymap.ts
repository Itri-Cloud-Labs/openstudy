import React from 'react';
import type { KeyEvent } from '@opentui/core';
import { useKeyboard } from '@opentui/react';

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

/**
 * Terminal-agnostic key shape shared by prompt and modal handlers.
 * OpenTUI parses raw sequences natively, so mouse-report filtering from the
 * Ink era is no longer needed anywhere.
 */
export interface AppKey {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  pageUp: boolean;
  pageDown: boolean;
  home: boolean;
  end: boolean;
  return: boolean;
  escape: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  space: boolean;
  ctrl: boolean;
  meta: boolean;
}

export interface AppKeyEvent {
  /** Printable character for single-character keys; otherwise the raw name. */
  input: string;
  key: AppKey;
}

const ARROW_NAMES: Record<string, keyof AppKey> = {
  up: 'upArrow',
  down: 'downArrow',
  left: 'leftArrow',
  right: 'rightArrow',
  pageup: 'pageUp',
  pagedown: 'pageDown',
};

/** Translate an OpenTUI parsed key event into the app-wide key shape. */
export function toAppKeyEvent(event: KeyEvent): AppKeyEvent {
  const key: AppKey = {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageUp: false,
    pageDown: false,
    home: false,
    end: false,
    return: false,
    escape: false,
    tab: false,
    backspace: false,
    delete: false,
    space: false,
    ctrl: event.ctrl,
    meta: event.meta,
  };

  const name = event.name;
  if (name === 'return') key.return = true;
  else if (name === 'escape') key.escape = true;
  else if (name === 'tab') key.tab = true;
  else if (name === 'space') key.space = true;
  else if (name === 'backspace') key.backspace = true;
  else if (name === 'delete') key.delete = true;
  else if (name === 'home') key.home = true;
  else if (name === 'end') key.end = true;
  else {
    const arrow = ARROW_NAMES[name];
    if (arrow) key[arrow] = true;
  }

  // Mirror the Ink-era contract: single-character names surface their
  // character through `input` even under ctrl/meta so handlers can match
  // combinations like `key.ctrl && input === 'r'`.
  let input = '';
  if (name.length === 1) input = event.shift ? name.toUpperCase() : name;
  else if (name === 'space') input = ' ';

  return { input, key };
}

export interface UseAppKeysOptions {
  isActive?: boolean;
}

/**
 * Subscribe to key presses with the app-wide key shape. Mirrors the Ink-era
 * `useInput(handler, { isActive })` contract used across prompts and modals.
 */
export function useAppKeys(handler: (event: AppKeyEvent) => void, options: UseAppKeysOptions = {}): void {
  const { isActive = true } = options;
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;
  const activeRef = React.useRef(isActive);
  activeRef.current = isActive;

  useKeyboard(event => {
    if (!activeRef.current) return;
    handlerRef.current(toAppKeyEvent(event));
  });
}
