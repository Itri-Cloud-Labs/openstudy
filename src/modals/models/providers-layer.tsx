import { Box, Text } from 'ink';
import { truncateError } from '../../shared/text.js';
import { focusTextColor } from '../../utils/index.js';
import type { ModalRenderProps } from '../types.js';
import { getProviderStatus, getProviderStatusColor } from './auth.js';
import { getModelProviders, SPINNER_FRAMES, type ModelsProvidersState } from './state.js';
import { THEME } from '../../shared/theme.js';

export function ProviderLayer({ modal, context }: ModalRenderProps<ModelsProvidersState>) {
  const providers = getModelProviders();
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Select Provider
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Choose a provider before selecting a model.</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {providers.length === 0 ? (
          <Text color={THEME.textMuted}>No providers available</Text>
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
              <Box
                key={provider.id}
                backgroundColor={isSelected ? subjectColor : undefined}
                justifyContent="space-between"
              >
                <Text color={isSelected ? THEME.onAccent : THEME.text} bold={isSelected}>
                  {provider.label}
                </Text>
                <Text color={focusTextColor(getProviderStatusColor(status), subjectColor, isSelected)} bold>
                  {statusLabel}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
      <Box justifyContent="space-between">
        <Text color={modal.error ? THEME.danger : THEME.textMuted}>
          {modal.error ? truncateError(modal.error) : providers.length === 0 ? 'providers unavailable' : '↑↓ move'}
        </Text>
        <Text color={THEME.textMuted}>enter continue</Text>
      </Box>
    </>
  );
}
