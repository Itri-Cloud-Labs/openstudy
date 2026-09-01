import { TextAttributes } from '@opentui/core';
import { createProvider, type ProviderReasoningLevel } from '../providers/index.js';
import { focusTextColor } from '../utils/colors.js';
import { createHandleInput, isCancel, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps } from './types.js';
import { THEME } from '../shared/theme.js';

const REASONING_MODAL_MAX_ROWS = 6;

type ReasoningModalState =
  | { id: 'reasoning'; selected: number; levels: ProviderReasoningLevel[]; model: string; providerLabel: string }
  | { id: 'reasoning'; selected: number; levels: []; error: string };

export function open(context: ModalContext): ReasoningModalState {
  const selectedModel = context.selectedModel;

  if (!selectedModel) {
    return { id: 'reasoning', selected: 0, levels: [], error: 'Select a model before choosing reasoning.' };
  }

  const provider = createProvider(selectedModel.provider);
  const modelOption = provider?.getModels().find(option => option.model === selectedModel.name) ?? null;

  if (!provider || !modelOption) {
    return { id: 'reasoning', selected: 0, levels: [], error: 'Selected model is unavailable.' };
  }

  if (modelOption.reasoningLevels.length === 0) {
    return { id: 'reasoning', selected: 0, levels: [], error: `${modelOption.label} has no reasoning levels.` };
  }

  const selected = Math.max(
    0,
    modelOption.reasoningLevels.findIndex(level => level.value === context.preferences.reasoningEffort),
  );

  return {
    id: 'reasoning',
    selected,
    levels: modelOption.reasoningLevels,
    model: modelOption.label,
    providerLabel: provider.label,
  };
}

export function getHeight(modal: ReasoningModalState) {
  const state = modal;
  const rows = Math.max(1, Math.min(REASONING_MODAL_MAX_ROWS, state.levels.length));
  return rows + 7;
}

export function render({ modal, context }: ModalRenderProps<ReasoningModalState>) {
  const state = modal;

  if ('error' in state) {
    return (
      <>
        <box style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
          <text fg={THEME.text} attributes={TextAttributes.BOLD}>
            Select Reasoning
          </text>
          <text fg={THEME.textMuted}>esc</text>
        </box>
        <box style={{ marginBottom: 1 }}>
          <text fg={THEME.danger}>{state.error}</text>
        </box>
        <box style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <text fg={THEME.textMuted}>enter close</text>
        </box>
      </>
    );
  }

  const rows = Math.max(1, Math.min(REASONING_MODAL_MAX_ROWS, state.levels.length));
  const windowStart = Math.min(Math.max(0, state.selected - rows + 1), Math.max(0, state.levels.length - rows));
  const visibleLevels = state.levels.slice(windowStart, windowStart + rows);
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';

  return (
    <>
      <box style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          {state.providerLabel}/{state.model}
        </text>
        <text fg={THEME.textMuted}>esc</text>
      </box>
      <box style={{ marginBottom: 1 }}>
        <text fg={THEME.textMuted}>Select a reasoning level.</text>
      </box>
      <box style={{ flexDirection: 'column', marginBottom: 1 }}>
        {visibleLevels.map((level, index) => {
          const levelIndex = windowStart + index;
          const isSelected = state.selected === levelIndex;
          const isCurrent = context.preferences.reasoningEffort === level.value;

          return (
            <box
              key={level.id}
              style={{
                flexDirection: 'row',
                backgroundColor: isSelected ? subjectColor : undefined,
                justifyContent: 'space-between',
              }}
            >
              <text
                fg={isSelected ? THEME.onAccent : THEME.text}
                attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
              >
                {level.label}
              </text>
              {isCurrent && <text fg={focusTextColor(THEME.success, subjectColor, isSelected)}>current</text>}
            </box>
          );
        })}
      </box>
      <box style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <text fg={THEME.textMuted}>
          {`↑↓ move ${windowStart + 1}-${windowStart + visibleLevels.length}/${state.levels.length}`}
        </text>
        <text fg={THEME.textMuted}>enter select</text>
      </box>
    </>
  );
}

export const handleInput = createHandleInput<ReasoningModalState>([
  {
    when: isCancel,
    run: ({ context }) => context.closeModal(),
  },
  {
    when: isSubmit,
    run: selectReasoningLevel,
  },
  {
    when: ({ key }) => key.upArrow,
    run: props => moveSelection(props, -1),
  },
  {
    when: ({ key }) => key.downArrow,
    run: props => moveSelection(props, 1),
  },
]);

function selectReasoningLevel({ modal, context }: ModalInputProps<ReasoningModalState>) {
  const state = modal;
  if ('error' in state) {
    context.closeModal();
    return;
  }

  const level = state.levels[state.selected];
  if (level) context.updatePreferences({ reasoningEffort: level.value });
  context.closeModal();
}

function moveSelection({ modal, context }: ModalInputProps<ReasoningModalState>, direction: -1 | 1) {
  const state = modal;
  if ('error' in state || state.levels.length === 0) return;

  context.updateModal({ ...state, selected: (state.selected + direction + state.levels.length) % state.levels.length });
}
