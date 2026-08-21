import { Box, Text } from 'ink';
import type { StudySession } from '../domain/study.js';
import { focusTextColor } from '../utils/colors.js';
import { getAllSessions } from '../utils/sessions.js';
import { formatMaterialLabel, truncate, truncateError } from '../shared/text.js';
import { createHandleInput, isCancel, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps } from './types.js';
import { THEME } from '../shared/theme.js';

const SESSIONS_MODAL_MAX_ROWS = 8;

interface SessionsModalState {
  id: 'sessions';
  selected: number;
  sessions: StudySession[];
  error?: string;
}

export function open(context: ModalContext): SessionsModalState {
  const sessions = getAllSessions();
  const currentIndex = sessions.findIndex(session => session.id === context.activeSessionId);

  return { id: 'sessions', selected: Math.max(0, currentIndex), sessions };
}

export function getHeight(modal: SessionsModalState) {
  const rows = Math.max(1, Math.min(SESSIONS_MODAL_MAX_ROWS, modal.sessions.length));

  return rows + (modal.error ? 7 : 6);
}

export function render({ modal, context }: ModalRenderProps<SessionsModalState>) {
  const state = modal;
  const subjectColor = context.selectedSubject?.color ?? '#3b82f6';
  const sessions = state.sessions;
  const rows = Math.max(1, Math.min(SESSIONS_MODAL_MAX_ROWS, sessions.length));
  const selected = Math.min(state.selected, Math.max(0, sessions.length - 1));
  const windowStart = Math.min(Math.max(0, selected - rows + 1), Math.max(0, sessions.length - rows));
  const visibleSessions = sessions.slice(windowStart, windowStart + rows);

  return (
    <>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={THEME.text} bold>
          Saved Sessions
        </Text>
        <Text color={THEME.textMuted}>esc</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={THEME.textMuted}>Choose a session to resume.</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {sessions.length === 0 ? (
          <Text color={THEME.textMuted}>No saved sessions yet</Text>
        ) : (
          visibleSessions.map((session, index) => {
            const sessionIndex = windowStart + index;
            const isSelected = selected === sessionIndex;
            const isCurrent = session.id === context.activeSessionId;

            return (
              <Box
                key={session.id}
                backgroundColor={isSelected ? subjectColor : undefined}
                justifyContent="space-between"
              >
                <Text color={isSelected ? THEME.onAccent : THEME.text} bold={isSelected}>
                  {truncate(getSessionTitle(session), 34)}
                </Text>
                <Text color={focusTextColor(isCurrent ? THEME.success : THEME.textMuted, subjectColor, isSelected)}>
                  {isCurrent ? 'current' : getSessionMeta(session)}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
      {state.error && (
        <Box marginBottom={1}>
          <Text color={THEME.danger}>{truncateError(state.error)}</Text>
        </Box>
      )}
      <Box justifyContent="space-between">
        <Text color={THEME.textMuted}>
          up/down{' '}
          {sessions.length === 0
            ? '0-0/0'
            : `${windowStart + 1}-${windowStart + visibleSessions.length}/${sessions.length}`}
        </Text>
        <Text color={THEME.textMuted}>enter open</Text>
      </Box>
    </>
  );
}

export const handleInput = createHandleInput<SessionsModalState>([
  {
    when: isCancel,
    run: ({ context }) => context.closeModal(),
  },
  {
    when: isSubmit,
    run: selectSession,
  },
  {
    when: ({ key }) => key.upArrow,
    run: props => moveSelection(props, -1),
  },
  {
    when: ({ key }) => key.downArrow,
    run: props => moveSelection(props, 1),
  },
]);

function selectSession({ modal, context }: ModalInputProps<SessionsModalState>) {
  const session = modal.sessions[modal.selected];

  if (!session) {
    context.updateModal<SessionsModalState>({ ...modal, error: 'No saved sessions to open.' });
    return;
  }

  const activated = context.setSession(session.id);
  if (!activated) {
    context.updateModal<SessionsModalState>({ ...modal, error: 'That session could not be loaded.' });
    return;
  }

  context.closeModal();
}

function moveSelection({ modal, context }: ModalInputProps<SessionsModalState>, direction: -1 | 1) {
  if (modal.sessions.length === 0) return;

  context.updateModal<SessionsModalState>({
    ...modal,
    selected: (modal.selected + direction + modal.sessions.length) % modal.sessions.length,
    error: undefined,
  });
}

function getSessionTitle(session: StudySession) {
  if (session.title?.trim()) return session.title;

  const material = materialLabel(session);
  if (material) return formatMaterialLabel(material, 34);

  return `Session ${session.id.slice(0, 8)}`;
}

function getSessionMeta(session: StudySession) {
  if (session.lastOpenedAt) return formatRelativeDate(session.lastOpenedAt);
  if (session.modeResults.summary) return 'summary';
  if (session.preferences.subject) return truncate(session.preferences.subject, 12);
  return 'draft';
}

function materialLabel(session: StudySession) {
  const material = session.preferences.material;
  if (!material) return null;
  return material.kind === 'url' ? material.url : material.path;
}

function formatRelativeDate(iso: string) {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);

  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;

  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;

  if (dateStart === todayStart) return 'today';
  if (dateStart === yesterdayStart) return 'yesterday';

  const days = Math.floor(diffMs / 86_400_000);
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 28) return `${Math.floor(days / 7)} weeks ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
