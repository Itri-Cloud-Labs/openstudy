import { Box, Text } from 'ink';
import type { SessionSettings } from '../domain/study.js';
import { focusTextColor, getAllSession } from '../utils/index.js';
import { formatMaterialLabel, truncate } from '../shared/text.js';
import { createHandleInput, isCancel, isSubmit } from './input.js';
import type { ModalContext, ModalInputProps, ModalRenderProps, ModalState } from './types.js';
import { THEME } from '../shared/theme.js';

const SESSIONS_MODAL_MAX_ROWS = 8;

interface SessionsModalState extends ModalState {
  id: 'sessions';
  selected: number;
  sessions: SessionSettings[];
  error?: string;
}

export function open(context: ModalContext): ModalState {
  const sessions = getStoredSessions();
  const currentIndex = sessions.findIndex(session => session.sessionId === context.activeSessionId);

  return { id: 'sessions', selected: Math.max(0, currentIndex), sessions };
}

export function getHeight(modal: ModalState) {
  const state = modal as SessionsModalState;
  const rows = Math.max(1, Math.min(SESSIONS_MODAL_MAX_ROWS, state.sessions.length));

  return rows + (state.error ? 7 : 6);
}

export function render({ modal, context }: ModalRenderProps) {
  const state = modal as SessionsModalState;
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
            const isCurrent = session.sessionId === context.activeSessionId;

            return (
              <Box
                key={session.sessionId ?? sessionIndex}
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
          <Text color={THEME.danger}>{state.error}</Text>
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

export const handleInput = createHandleInput([
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

function selectSession({ modal, context }: ModalInputProps) {
  const state = modal as SessionsModalState;
  const sessions = state.sessions;
  const session = sessions[state.selected];

  if (!session?.sessionId) {
    context.updateModal({
      ...state,
      error: sessions.length === 0 ? 'No saved sessions to open.' : 'Selected session is missing an id.',
    });
    return;
  }

  const selectedSession = context.setSession(session.sessionId);
  if (!selectedSession) {
    context.updateModal({ ...state, error: 'That session could not be loaded.' });
    return;
  }

  context.closeModal();
}

function moveSelection({ modal, context }: ModalInputProps, direction: -1 | 1) {
  const state = modal as SessionsModalState;
  const sessions = state.sessions;
  if (sessions.length === 0) return;

  context.updateModal({
    ...state,
    selected: (state.selected + direction + sessions.length) % sessions.length,
    error: undefined,
  });
}

function getStoredSessions() {
  return getAllSession()
    .filter(session => Boolean(session.sessionId))
    .sort((a, b) => {
      const aTime = a.lastOpenedDate ?? a.createdDate ?? '';
      const bTime = b.lastOpenedDate ?? b.createdDate ?? '';
      return bTime.localeCompare(aTime);
    });
}

function getSessionTitle(session: SessionSettings) {
  if (session.title?.trim()) return session.title;

  if (session.material) {
    return formatMaterialLabel(session.material, 34);
  }

  return session.sessionId ? `Session ${session.sessionId.slice(0, 8)}` : 'Untitled Session';
}

function getSessionMeta(session: SessionSettings) {
  if (session.lastOpenedDate) return formatRelativeDate(session.lastOpenedDate);
  if (session.createdDate) return formatRelativeDate(session.createdDate);
  if (session.summaryText) return 'summary';
  if (session.subject) return truncate(session.subject, 12);
  return 'draft';
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
