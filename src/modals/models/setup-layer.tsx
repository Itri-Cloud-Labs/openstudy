import { Box, Text } from 'ink';
import { THEME } from '../../shared/theme.js';
import type { ModalRenderProps } from '../types.js';
import { getProviderLabel, type ModelsSetupState } from './state.js';

export function SetupLayer({ modal, context }: ModalRenderProps<ModelsSetupState>) {
  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Set Up {getProviderLabel(modal.provider)}
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Enter API key to unlock this provider.</Text>
      </Box>
      <Box backgroundColor={THEME.backgroundRaised} paddingX={1} marginBottom={1}>
        <Text color={modal.apiKey ? THEME.text : THEME.textMuted}>
          {modal.apiKey ? '*'.repeat(modal.apiKey.length) : 'API key'}
        </Text>
        <Text color={context.selectedSubject?.color ?? '#3b82f6'}>█</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color={modal.error ? THEME.danger : THEME.textMuted}>{modal.error ?? '← providers'}</Text>
        <Text color={THEME.textMuted}>enter save</Text>
      </Box>
    </>
  );
}
