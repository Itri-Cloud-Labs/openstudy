import { TextAttributes } from '@opentui/core';
import { THEME } from '../../shared/theme.js';
import type { ModalRenderProps } from '../types.js';
import type { ModelsSubProvidersState } from './state.js';
import { getProviderLabel, MODEL_MODAL_MAX_ROWS, getProviderModelOptions, getSubProviders } from './state.js';

export function SubProvidersLayer({ modal, context }: ModalRenderProps<ModelsSubProvidersState>) {
  const subProviders = getSubProviders(getProviderModelOptions(modal.provider));
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';
  const rows = Math.max(1, Math.min(MODEL_MODAL_MAX_ROWS, subProviders.length));
  const windowStart = Math.min(Math.max(0, modal.selected - rows + 1), Math.max(0, subProviders.length - rows));
  const visibleSubProviders = subProviders.slice(windowStart, windowStart + rows);

  return (
    <>
      <box style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          {getProviderLabel(modal.provider)}
        </text>
        <text fg={THEME.textMuted}>esc</text>
      </box>
      <box style={{ marginBottom: 1 }}>
        <text fg={THEME.textMuted}>Select a subprovider.</text>
      </box>
      <box style={{ flexDirection: 'column', marginBottom: 1 }}>
        {visibleSubProviders.length === 0 ? (
          <text fg={THEME.textMuted}>No providers available</text>
        ) : (
          visibleSubProviders.map((sp, index) => {
            const spIndex = windowStart + index;
            const isSelected = modal.selected === spIndex;
            return (
              <box key={sp.id} style={{ backgroundColor: isSelected ? subjectColor : undefined }}>
                <text
                  fg={isSelected ? THEME.onAccent : THEME.text}
                  attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
                >
                  {sp.name}
                </text>
              </box>
            );
          })
        )}
      </box>
      <box style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <text fg={THEME.textMuted}>← back ↑↓ move</text>
        <text fg={THEME.textMuted}>enter continue</text>
      </box>
    </>
  );
}
