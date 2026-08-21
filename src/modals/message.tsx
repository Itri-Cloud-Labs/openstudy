import { Box, Text } from 'ink';
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
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          {state.title}
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>{state.message}</Text>
      </Box>
      <Box justifyContent="flex-end">
        <Text color={THEME.onAccent} backgroundColor={context.selectedSubject?.color ?? '#3b82f6'}>
          {' '}
          ok{' '}
        </Text>
      </Box>
    </>
  );
}

export const handleInput = createHandleInput<MessageModalState>([
  {
    when: props => isCancel(props) || isSubmit(props),
    run: ({ context }) => context.closeModal(),
  },
]);
