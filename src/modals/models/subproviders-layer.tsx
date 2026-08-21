import { Box, Text } from 'ink';
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
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          {getProviderLabel(modal.provider)}
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Select a subprovider.</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {visibleSubProviders.length === 0 ? (
          <Text color={THEME.textMuted}>No providers available</Text>
        ) : (
          visibleSubProviders.map((sp, index) => {
            const spIndex = windowStart + index;
            const isSelected = modal.selected === spIndex;
            return (
              <Box key={sp.id} backgroundColor={isSelected ? subjectColor : undefined}>
                <Text color={isSelected ? THEME.onAccent : THEME.text} bold={isSelected}>
                  {sp.name}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
      <Box justifyContent="space-between">
        <Text color={THEME.textMuted}>← back ↑↓ move</Text>
        <Text color={THEME.textMuted}>enter continue</Text>
      </Box>
    </>
  );
}
