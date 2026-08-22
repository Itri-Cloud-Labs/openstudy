import { TextAttributes } from '@opentui/core';
import { THEME } from '../../shared/theme.js';
import { focusTextColor } from '../../utils/colors.js';
import type { ModalRenderProps } from '../types.js';
import { getProviderLabel, MODEL_MODAL_MAX_ROWS, type ModelsListState, getProviderModelOptions } from './state.js';

export function ModelsLayer({ modal, context }: ModalRenderProps<ModelsListState>) {
  const modelOptions = getProviderModelOptions(modal.provider, modal.subProvider);
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';
  const modelRows = Math.max(1, Math.min(MODEL_MODAL_MAX_ROWS, modelOptions.length));
  const modelWindowStart = Math.min(
    Math.max(0, modal.selected - modelRows + 1),
    Math.max(0, modelOptions.length - modelRows),
  );
  const visibleModels = modelOptions.slice(modelWindowStart, modelWindowStart + modelRows);

  return (
    <>
      <box style={{ justifyContent: 'space-between', marginBottom: 1 }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          {getProviderLabel(modal.provider)}
        </text>
        <text fg={THEME.textMuted}>esc</text>
      </box>
      <box style={{ marginBottom: 1 }}>
        <text fg={THEME.textMuted}>Select a model.</text>
      </box>
      <box style={{ flexDirection: 'column', marginBottom: 1 }}>
        {visibleModels.map((modelOption, index) => {
          const modelIndex = modelWindowStart + index;
          const isSelected = modal.selected === modelIndex;
          const isCurrent =
            context.selectedModel?.provider === modal.provider && context.selectedModel.name === modelOption.model;

          return (
            <box
              key={modelOption.id}
              style={{
                backgroundColor: isSelected ? subjectColor : undefined,
                justifyContent: 'space-between',
              }}
            >
              <text
                fg={isSelected ? THEME.onAccent : THEME.text}
                attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
              >
                {modelOption.label}
              </text>
              {isCurrent && <text fg={focusTextColor(THEME.success, subjectColor, isSelected)}>current</text>}
            </box>
          );
        })}
      </box>
      <box style={{ justifyContent: 'space-between' }}>
        <text fg={THEME.textMuted}>
          {modal.subProvider
            ? `← back ${modelWindowStart + 1}-${modelWindowStart + visibleModels.length}/${modelOptions.length}`
            : `← providers ${modelWindowStart + 1}-${modelWindowStart + visibleModels.length}/${modelOptions.length}`}
        </text>
        <text fg={THEME.textMuted}>enter select</text>
      </box>
    </>
  );
}
