import { Box, Text } from 'ink';
import { CONFIG_DIR } from '../utils/config.js';
import { erasePersistenceRoot } from '../infrastructure/persistence/index.js';
import { getSessionById } from '../utils/index.js';
import { createHandleInput, isBackspace, isCancel, isPlainTextInput, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps, ModalState } from './types.js';
import { THEME } from '../shared/theme.js';

const DEVTOOLS_MAX_ROWS = 10;

const OPTIONS = [
  { id: 'session', label: 'Dump session object', description: 'Show current persisted session state', disabled: false },
  {
    id: 'erase',
    label: 'Erase .openstudy directory',
    description: 'DANGEROUS: reset all OpenStudy state',
    disabled: false,
  },
  { id: 'more', label: 'More tools soon', description: 'Placeholder for future dev tools', disabled: true },
] as const;

type DevtoolsModalState =
  | { id: 'devtools'; layer: 'options'; selected: number }
  | { id: 'devtools'; layer: 'session'; scroll: number; lines: string[] }
  | { id: 'devtools'; layer: 'erase'; confirmation: string; error?: string }
  | { id: 'devtools'; layer: 'result'; title: string; message: string };

export function open(_context: ModalContext): ModalState {
  return { id: 'devtools', layer: 'options', selected: 0 };
}

export function getHeight(modal: ModalState) {
  const state = modal as DevtoolsModalState;
  if (state.layer === 'session') {
    return Math.max(1, Math.min(DEVTOOLS_MAX_ROWS, state.lines.length)) + 7;
  }

  return OPTIONS.length + 7;
}

export function render(props: ModalRenderProps) {
  const state = props.modal as DevtoolsModalState;

  if (state.layer === 'session') return <SessionDumpLayer {...props} modal={state} />;
  if (state.layer === 'erase') return <EraseLayer modal={state} />;
  if (state.layer === 'result') return <ResultLayer modal={state} />;
  return <OptionsLayer {...props} modal={state} />;
}

export const handleInput = createHandleInput([
  {
    when: props => isOptionsLayer(props) && isOptionsInput(props),
    run: props =>
      handleOptionsInput(props.key, props.modal as Extract<DevtoolsModalState, { layer: 'options' }>, props.context),
  },
  {
    when: props => isSessionLayer(props) && isSessionInput(props),
    run: props =>
      handleSessionInput(props.key, props.modal as Extract<DevtoolsModalState, { layer: 'session' }>, props.context),
  },
  {
    when: props => isEraseLayer(props) && isEraseInput(props),
    run: props =>
      handleEraseInput(
        props.input,
        props.key,
        props.modal as Extract<DevtoolsModalState, { layer: 'erase' }>,
        props.context,
      ),
  },
  {
    when: props => isResultLayer(props) && (isCancel(props) || isSubmit(props)),
    run: ({ context }) => context.closeModal(),
  },
]);

function OptionsLayer({
  modal,
  context,
}: ModalRenderProps & { modal: Extract<DevtoolsModalState, { layer: 'options' }> }) {
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Dev Tools
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Choose a diagnostic action.</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {OPTIONS.map((option, index) => {
          const isSelected = modal.selected === index;

          return (
            <Box key={option.id} backgroundColor={isSelected ? subjectColor : undefined} justifyContent="space-between">
              <Text
                color={isSelected ? THEME.onAccent : option.disabled ? THEME.textMuted : THEME.text}
                bold={isSelected}
              >
                {option.label}
              </Text>
              <Text color={isSelected ? THEME.onAccent : THEME.textMuted}>{option.description}</Text>
            </Box>
          );
        })}
      </Box>
      <Box justifyContent="space-between">
        <Text color={THEME.textMuted}>↑↓ move</Text>
        <Text color={THEME.textMuted}>enter open</Text>
      </Box>
    </>
  );
}

function EraseLayer({ modal }: { modal: Extract<DevtoolsModalState, { layer: 'erase' }> }) {
  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.danger} bold>
          Dangerous Action
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1} flexDirection="column">
        <Text color={THEME.text}>This will permanently delete:</Text>
        <Text color={THEME.danger}>{CONFIG_DIR}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Type </Text>
        <Text color={THEME.primary} bold>
          ERASE
        </Text>
        <Text color={THEME.textMuted}> to confirm.</Text>
      </Box>
      <Box backgroundColor={THEME.backgroundRaised} paddingX={1} marginBottom={1}>
        <Text color={modal.confirmation ? THEME.text : THEME.textMuted}>{modal.confirmation || 'ERASE'}</Text>
        <Text color={THEME.danger}>█</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color={modal.error ? THEME.danger : THEME.textMuted}>{modal.error ?? '← tools'}</Text>
        <Text color={THEME.textMuted}>enter confirm</Text>
      </Box>
    </>
  );
}

function ResultLayer({ modal }: { modal: Extract<DevtoolsModalState, { layer: 'result' }> }) {
  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          {modal.title}
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>{modal.message}</Text>
      </Box>
      <Box justifyContent="flex-end">
        <Text color={THEME.textMuted}>enter close</Text>
      </Box>
    </>
  );
}

function SessionDumpLayer({ modal }: ModalRenderProps & { modal: Extract<DevtoolsModalState, { layer: 'session' }> }) {
  const rows = Math.max(1, Math.min(DEVTOOLS_MAX_ROWS, modal.lines.length));
  const maxScroll = Math.max(0, modal.lines.length - rows);
  const scroll = Math.min(modal.scroll, maxScroll);
  const visibleLines = modal.lines.slice(scroll, scroll + rows);

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Session Dump
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Current session object.</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {visibleLines.map((line, index) => (
          <Text key={`${scroll + index}:${line}`} color={THEME.text}>
            {line}
          </Text>
        ))}
      </Box>
      <Box justifyContent="space-between">
        <Text color={THEME.textMuted}>
          ← tools {scroll + 1}-{scroll + visibleLines.length}/{modal.lines.length}
        </Text>
        <Text color={THEME.textMuted}>↑↓ scroll</Text>
      </Box>
    </>
  );
}

function isOptionsLayer({ modal }: ModalInputProps) {
  return (modal as DevtoolsModalState).layer === 'options';
}

function isSessionLayer({ modal }: ModalInputProps) {
  return (modal as DevtoolsModalState).layer === 'session';
}

function isEraseLayer({ modal }: ModalInputProps) {
  return (modal as DevtoolsModalState).layer === 'erase';
}

function isResultLayer({ modal }: ModalInputProps) {
  return (modal as DevtoolsModalState).layer === 'result';
}

function isOptionsInput(props: ModalInputProps) {
  return isCancel(props) || isSubmit(props) || props.key.upArrow || props.key.downArrow;
}

function isSessionInput(props: ModalInputProps) {
  return isCancel(props) || props.key.leftArrow || isBackspace(props) || props.key.upArrow || props.key.downArrow;
}

function isEraseInput(props: ModalInputProps) {
  return isCancel(props) || isSubmit(props) || props.key.leftArrow || isBackspace(props) || isPlainTextInput(props);
}

function handleOptionsInput(
  key: ModalInputProps['key'],
  state: Extract<DevtoolsModalState, { layer: 'options' }>,
  context: ModalContext,
) {
  if (key.escape) {
    context.closeModal();
    return;
  }

  if (key.upArrow) {
    context.updateModal({ ...state, selected: (state.selected - 1 + OPTIONS.length) % OPTIONS.length });
    return;
  }

  if (key.downArrow) {
    context.updateModal({ ...state, selected: (state.selected + 1) % OPTIONS.length });
    return;
  }

  if (key.return) {
    const option = OPTIONS[state.selected];
    if (!option || option.disabled) return;

    if (option.id === 'session') {
      const session = context.activeSessionId
        ? (getSessionById(context.activeSessionId) ?? context.session)
        : context.session;
      context.updateModal({
        id: 'devtools',
        layer: 'session',
        scroll: 0,
        lines: JSON.stringify(session, null, 2).split('\n'),
      });
    }

    if (option.id === 'erase') {
      context.updateModal({ id: 'devtools', layer: 'erase', confirmation: '' });
    }
  }
}

function handleSessionInput(
  key: ModalInputProps['key'],
  state: Extract<DevtoolsModalState, { layer: 'session' }>,
  context: ModalContext,
) {
  const rows = Math.max(1, Math.min(DEVTOOLS_MAX_ROWS, state.lines.length));
  const maxScroll = Math.max(0, state.lines.length - rows);

  if (key.escape) {
    context.closeModal();
    return;
  }

  if (key.leftArrow || key.backspace || key.delete) {
    context.updateModal({ id: 'devtools', layer: 'options', selected: 0 });
    return;
  }

  if (key.upArrow) {
    context.updateModal({ ...state, scroll: Math.max(0, state.scroll - 1) });
    return;
  }

  if (key.downArrow) {
    context.updateModal({ ...state, scroll: Math.min(maxScroll, state.scroll + 1) });
  }
}

function handleEraseInput(
  input: string,
  key: ModalInputProps['key'],
  state: Extract<DevtoolsModalState, { layer: 'erase' }>,
  context: ModalContext,
) {
  if (key.escape) {
    context.closeModal();
    return;
  }

  if (key.leftArrow) {
    context.updateModal({ id: 'devtools', layer: 'options', selected: 1 });
    return;
  }

  if (key.return) {
    if (state.confirmation !== 'ERASE') {
      context.updateModal({ ...state, error: 'Confirmation must exactly match ERASE.' });
      return;
    }

    try {
      erasePersistenceRoot(CONFIG_DIR);
      context.updateModal({
        id: 'devtools',
        layer: 'result',
        title: 'OpenStudy State Erased',
        message: 'Deleted .openstudy. Restart OpenStudy to reload clean state.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.updateModal({ ...state, error: message });
    }
    return;
  }

  if (key.backspace || key.delete) {
    context.updateModal({ ...state, confirmation: state.confirmation.slice(0, -1), error: undefined });
    return;
  }

  if (!key.ctrl && !key.meta && !key.tab && input) {
    context.updateModal({ ...state, confirmation: state.confirmation + input, error: undefined });
  }
}
