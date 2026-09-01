import { TextAttributes } from '@opentui/core';
import { createHandleInput, isBackspace, isCancel, isPlainTextInput, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps } from './types.js';
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

interface LanguageModalState {
  id: 'language';
  filter: string;
  selected: number;
}

export function open(context: ModalContext): LanguageModalState {
  const selected = Math.max(
    0,
    LANGUAGES.findIndex(language => language === context.preferences.studyLanguage),
  );

  return { id: 'language', filter: '', selected };
}

export function getHeight(modal: LanguageModalState) {
  const filteredLanguages = getFilteredLanguages(modal);
  const rows = Math.max(1, Math.min(LANGUAGE_MODAL_MAX_ROWS, filteredLanguages.length));
  return rows + 7;
}

export function render({ modal, context }: ModalRenderProps<LanguageModalState>) {
  const state = modal;
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';
  const filteredLanguages = getFilteredLanguages(state);
  const rows = Math.max(1, Math.min(LANGUAGE_MODAL_MAX_ROWS, filteredLanguages.length));
  const windowStart = Math.min(Math.max(0, state.selected - rows + 1), Math.max(0, filteredLanguages.length - rows));
  const visibleLanguages = filteredLanguages.slice(windowStart, windowStart + rows);

  return (
    <>
      <box style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          Select Language
        </text>
        <text fg={THEME.textMuted}>esc</text>
      </box>
      <box style={{ marginBottom: 1 }}>
        <text>
          <span fg={THEME.textMuted}>Search </span>
          <span fg={THEME.text}>{state.filter}</span>
          <span fg={subjectColor}>█</span>
        </text>
      </box>
      <box style={{ flexDirection: 'column', marginBottom: 1 }}>
        {filteredLanguages.length === 0 ? (
          <text fg={THEME.textMuted}>No languages found</text>
        ) : (
          visibleLanguages.map((language, index) => {
            const languageIndex = windowStart + index;
            const isSelected = state.selected === languageIndex;
            const isCurrent = context.preferences.studyLanguage === language;

            return (
              <box
                key={language}
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
                  {language}
                </text>
                {isCurrent && <text fg={isSelected ? THEME.onAccent : THEME.success}>current</text>}
              </box>
            );
          })
        )}
      </box>
      <box style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <text fg={THEME.textMuted}>
          {`↑↓ move ${windowStart + 1}-${windowStart + visibleLanguages.length}/${filteredLanguages.length}`}
        </text>
        <text fg={THEME.textMuted}>enter select</text>
      </box>
    </>
  );
}

export const handleInput = createHandleInput<LanguageModalState>([
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
      context.updateModal({ ...modal, filter: modal.filter.slice(0, -1), selected: 0 });
    },
  },
  {
    when: isPlainTextInput,
    run: ({ input, modal, context }) => {
      context.updateModal({ ...modal, filter: modal.filter + input, selected: 0 });
    },
  },
]);

function selectLanguage({ modal, context }: ModalInputProps<LanguageModalState>) {
  const state = modal;
  const filteredLanguages = getFilteredLanguages(state);
  const language = filteredLanguages[state.selected];
  if (language) context.updatePreferences({ studyLanguage: language });
  context.closeModal();
}

function moveSelection({ modal, context }: ModalInputProps<LanguageModalState>, direction: -1 | 1) {
  const state = modal;
  const filteredLanguages = getFilteredLanguages(state);
  const count = Math.max(1, filteredLanguages.length);
  context.updateModal({ ...state, selected: (state.selected + direction + count) % count });
}

function getFilteredLanguages(modal: LanguageModalState) {
  const filter = modal.filter.trim().toLowerCase();
  if (!filter) return LANGUAGES;
  return LANGUAGES.filter(language => language.toLowerCase().includes(filter));
}
