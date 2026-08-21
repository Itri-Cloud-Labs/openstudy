import { Box, Text } from 'ink';
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
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          {getProviderLabel(modal.provider)}
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Select a model.</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {visibleModels.map((modelOption, index) => {
          const modelIndex = modelWindowStart + index;
          const isSelected = modal.selected === modelIndex;
          const isCurrent =
            context.selectedModel?.provider === modal.provider && context.selectedModel.name === modelOption.model;

          return (
            <Box
              key={modelOption.id}
              backgroundColor={isSelected ? subjectColor : undefined}
              justifyContent="space-between"
            >
              <Text color={isSelected ? THEME.onAccent : THEME.text} bold={isSelected}>
                {modelOption.label}
              </Text>
              {isCurrent && <Text color={focusTextColor(THEME.success, subjectColor, isSelected)}>current</Text>}
            </Box>
          );
        })}
      </Box>
      <Box justifyContent="space-between">
        <Text color={THEME.textMuted}>
          {modal.subProvider ? '← back' : '← providers'} {modelWindowStart + 1}-
          {modelWindowStart + visibleModels.length}/{modelOptions.length}
        </Text>
        <Text color={THEME.textMuted}>enter select</Text>
      </Box>
    </>
  );
}
