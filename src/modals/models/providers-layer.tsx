import { TextAttributes } from '@opentui/core';
import { truncateError } from '../../shared/text.js';
import { focusTextColor } from '../../utils/colors.js';
import type { ModalRenderProps } from '../types.js';
import { getProviderStatus, getProviderStatusColor } from './auth.js';
import { getModelProviders, SPINNER_FRAMES, type ModelsProvidersState } from './state.js';
import { THEME } from '../../shared/theme.js';

export function ProviderLayer({ modal, context }: ModalRenderProps<ModelsProvidersState>) {
  const providers = getModelProviders();
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';

  return (
    <>
      <box style={{ justifyContent: 'space-between', marginBottom: 1 }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          Select Provider
        </text>
        <text fg={THEME.textMuted}>esc</text>
      </box>
      <box style={{ marginBottom: 1 }}>
        <text fg={THEME.textMuted}>Choose a provider before selecting a model.</text>
      </box>
      <box style={{ flexDirection: 'column', marginBottom: 1 }}>
        {providers.length === 0 ? (
          <text fg={THEME.textMuted}>No providers available</text>
        ) : (
          providers.map((provider, index) => {
            const isSelected = modal.selected === index;
            const status = getProviderStatus(provider, context, modal.auth);
            const statusLabel =
              status === 'checking'
                ? SPINNER_FRAMES[modal.spinnerFrame % SPINNER_FRAMES.length]
                : status === 'ready'
                  ? '✔'
                  : status === 'login'
                    ? '✖'
                    : status;

            return (
              <box
                key={provider.id}
                style={{
                  backgroundColor: isSelected ? subjectColor : undefined,
                  justifyContent: 'space-between',
                }}
              >
                <text
                  fg={isSelected ? THEME.onAccent : THEME.text}
                  attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
                >
                  {provider.label}
                </text>
                <text
                  fg={focusTextColor(getProviderStatusColor(status), subjectColor, isSelected)}
                  attributes={TextAttributes.BOLD}
                >
                  {statusLabel}
                </text>
              </box>
            );
          })
        )}
      </box>
      <box style={{ justifyContent: 'space-between' }}>
        <text fg={modal.error ? THEME.danger : THEME.textMuted}>
          {modal.error ? truncateError(modal.error) : providers.length === 0 ? 'providers unavailable' : '↑↓ move'}
        </text>
        <text fg={THEME.textMuted}>enter continue</text>
      </box>
    </>
  );
}
