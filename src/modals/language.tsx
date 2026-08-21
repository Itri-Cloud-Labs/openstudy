import { Box, Text } from 'ink';
import { createHandleInput, isBackspace, isCancel, isPlainTextInput, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps, ModalState } from './types.js';
import { THEME } from '../shared/theme.js';

const LANGUAGE_MODAL_MAX_ROWS = 8;

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean',
  'Hindi',
  'Dutch',
  'Russian',
  'Turkish',
];

interface LanguageModalState extends ModalState {
  id: 'language';
  filter: string;
  selected: number;
}

export function open(context: ModalContext): ModalState {
  const selected = Math.max(
    0,
    LANGUAGES.findIndex(language => language === context.session.studyLanguage),
  );

  return { id: 'language', filter: '', selected };
}

export function getHeight(modal: ModalState) {
  const filteredLanguages = getFilteredLanguages(modal as LanguageModalState);
  const rows = Math.max(1, Math.min(LANGUAGE_MODAL_MAX_ROWS, filteredLanguages.length));
  return rows + 7;
}

export function render({ modal, context }: ModalRenderProps) {
  const state = modal as LanguageModalState;
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';
  const filteredLanguages = getFilteredLanguages(state);
  const rows = Math.max(1, Math.min(LANGUAGE_MODAL_MAX_ROWS, filteredLanguages.length));
  const windowStart = Math.min(Math.max(0, state.selected - rows + 1), Math.max(0, filteredLanguages.length - rows));
  const visibleLanguages = filteredLanguages.slice(windowStart, windowStart + rows);

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Select Language
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Search </Text>
        <Text color={THEME.text}>{state.filter}</Text>
        <Text color={subjectColor}>█</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {filteredLanguages.length === 0 ? (
          <Text color={THEME.textMuted}>No languages found</Text>
        ) : (
          visibleLanguages.map((language, index) => {
            const languageIndex = windowStart + index;
            const isSelected = state.selected === languageIndex;
            const isCurrent = context.session.studyLanguage === language;

            return (
              <Box
                key={language}
                backgroundColor={isSelected ? subjectColor : undefined}
                justifyContent="space-between"
              >
                <Text color={isSelected ? THEME.onAccent : THEME.text} bold={isSelected}>
                  {language}
                </Text>
                {isCurrent && <Text color={isSelected ? THEME.onAccent : THEME.success}>current</Text>}
              </Box>
            );
          })
        )}
      </Box>
      <Box justifyContent="space-between">
        <Text color={THEME.textMuted}>
          ↑↓ move {windowStart + 1}-{windowStart + visibleLanguages.length}/{filteredLanguages.length}
        </Text>
        <Text color={THEME.textMuted}>enter select</Text>
      </Box>
    </>
  );
}

export const handleInput = createHandleInput([
  {
    when: isCancel,
    run: ({ context }) => context.closeModal(),
  },
  {
    when: isSubmit,
    run: selectLanguage,
  },
  {
    when: ({ key }) => key.upArrow,
    run: props => moveSelection(props, -1),
  },
  {
    when: ({ key }) => key.downArrow,
    run: props => moveSelection(props, 1),
  },
  {
    when: isBackspace,
    run: ({ modal, context }) => {
      const state = modal as LanguageModalState;
      context.updateModal({ ...state, filter: state.filter.slice(0, -1), selected: 0 });
    },
  },
  {
    when: isPlainTextInput,
    run: ({ input, modal, context }) => {
      const state = modal as LanguageModalState;
      context.updateModal({ ...state, filter: state.filter + input, selected: 0 });
    },
  },
]);

function selectLanguage({ modal, context }: ModalInputProps) {
  const state = modal as LanguageModalState;
  const filteredLanguages = getFilteredLanguages(state);
  const language = filteredLanguages[state.selected];
  if (language) context.updateSettings({ studyLanguage: language });
  context.closeModal();
}

function moveSelection({ modal, context }: ModalInputProps, direction: -1 | 1) {
  const state = modal as LanguageModalState;
  const filteredLanguages = getFilteredLanguages(state);
  const count = Math.max(1, filteredLanguages.length);
  context.updateModal({ ...state, selected: (state.selected + direction + count) % count });
}

function getFilteredLanguages(modal: LanguageModalState) {
  const filter = modal.filter.trim().toLowerCase();
  if (!filter) return LANGUAGES;
  return LANGUAGES.filter(language => language.toLowerCase().includes(filter));
}
