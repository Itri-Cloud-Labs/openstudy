import { TextAttributes } from '@opentui/core';
import { subjects } from '../options/index.js';
import { focusTextColor } from '../utils/colors.js';
import { createHandleInput, isBackspace, isCancel, isPlainTextInput, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps } from './types.js';
import { THEME } from '../shared/theme.js';

const SUBJECT_MODAL_MAX_ROWS = 6;

interface SubjectsModalState {
  id: 'subjects';
  filter: string;
  selected: number;
}

export function open(context: ModalContext): SubjectsModalState {
  const selected = Math.max(
    0,
    subjects.findIndex(subject => subject.name === context.selectedSubject?.name),
  );

  return { id: 'subjects', filter: '', selected };
}

export function getHeight(modal: SubjectsModalState) {
  const filteredSubjects = getFilteredSubjects(modal);
  const subjectRows = Math.max(1, Math.min(SUBJECT_MODAL_MAX_ROWS, filteredSubjects.length));
  return subjectRows + 7;
}

export function render({ modal, context }: ModalRenderProps<SubjectsModalState>) {
  const state = modal;
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';

  const filteredSubjects = getFilteredSubjects(state);
  const subjectRows = Math.max(1, Math.min(SUBJECT_MODAL_MAX_ROWS, filteredSubjects.length));
  const subjectWindowStart = Math.min(
    Math.max(0, state.selected - subjectRows + 1),
    Math.max(0, filteredSubjects.length - subjectRows),
  );
  const visibleSubjects = filteredSubjects.slice(subjectWindowStart, subjectWindowStart + subjectRows);

  return (
    <>
      <box style={{ justifyContent: 'space-between', marginBottom: 1 }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          Select Subject
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
        {filteredSubjects.length === 0 ? (
          <text fg={THEME.textMuted}>No results found</text>
        ) : (
          visibleSubjects.map((subject, index) => {
            const subjectIndex = subjectWindowStart + index;
            const isSelected = state.selected === subjectIndex;

            return (
              <box key={subject.name} style={{ backgroundColor: isSelected ? subjectColor : undefined }}>
                <text>
                  <span
                    fg={focusTextColor(subject.color, subjectColor, isSelected)}
                    attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
                  >
                    {'● '}
                  </span>
                  <span
                    fg={isSelected ? THEME.onAccent : THEME.text}
                    attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
                  >
                    {subject.name}
                  </span>
                </text>
              </box>
            );
          })
        )}
      </box>
      <box style={{ justifyContent: 'space-between' }}>
        <text fg={THEME.textMuted}>
          {`↑↓ move ${subjectWindowStart + 1}-${subjectWindowStart + visibleSubjects.length}/${filteredSubjects.length}`}
        </text>
        <text fg={THEME.textMuted}>enter select</text>
      </box>
    </>
  );
}

export const handleInput = createHandleInput<SubjectsModalState>([
  {
    when: isCancel,
    run: ({ context }) => context.closeModal(),
  },
  {
    when: isSubmit,
    run: selectSubject,
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

function selectSubject({ modal, context }: ModalInputProps<SubjectsModalState>) {
  const state = modal;
  const filteredSubjects = getFilteredSubjects(state);
  const subject = filteredSubjects[state.selected];
  if (subject) context.updatePreferences({ subject: subject.name });
  context.closeModal();
}

function moveSelection({ modal, context }: ModalInputProps<SubjectsModalState>, direction: -1 | 1) {
  const state = modal;
  const filteredSubjects = getFilteredSubjects(state);
  const count = Math.max(1, filteredSubjects.length);
  context.updateModal({ ...state, selected: (state.selected + direction + count) % count });
}

function getFilteredSubjects(modal: SubjectsModalState) {
  const filter = modal.filter.trim().toLowerCase();
  if (!filter) return subjects;
  return subjects.filter(subject => subject.name.toLowerCase().includes(filter));
}
