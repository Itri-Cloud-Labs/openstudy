import { TextAttributes } from '@opentui/core';
import { createHandleInput, isCancel, isSubmit } from './input.js';
import type { ModalContext, ModalRenderProps } from './types.js';
import { THEME } from '../shared/theme.js';

interface MessageModalState {
  id: 'message';
  title: string;
  message: string;
}

export function open(_context: ModalContext, initialState?: Record<string, unknown>): MessageModalState {
  return {
    id: 'message',
    title: typeof initialState?.['title'] === 'string' ? initialState['title'] : 'Message',
    message: typeof initialState?.['message'] === 'string' ? initialState['message'] : '',
  };
}

export function getHeight() {
  return 7;
}

export function render({ modal, context }: ModalRenderProps<MessageModalState>) {
  const state = modal;

  return (
    <>
      <box style={{ justifyContent: 'space-between', marginBottom: 1 }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          {state.title}
        </text>
        <text fg={THEME.textMuted}>esc</text>
      </box>
      <box style={{ marginBottom: 1 }}>
        <text fg={THEME.textMuted}>{state.message}</text>
      </box>
      <box style={{ justifyContent: 'flex-end' }}>
        <text fg={THEME.onAccent} bg={context.selectedSubject?.color ?? '#3b82f6'}>
          {' ok '}
        </text>
      </box>
    </>
  );
}

export const handleInput = createHandleInput<MessageModalState>([
  {
    when: props => isCancel(props) || isSubmit(props),
    run: ({ context }) => context.closeModal(),
  },
]);
