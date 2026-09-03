import React from 'react';
import { TextAttributes } from '@opentui/core';
import type { CommandContext, CommandModule } from '../../commands/index.js';
import type { SessionPresentation } from '../session-presentation.js';
import { QuizMode } from './modes/quiz/QuizMode.js';
import { useQuiz } from './modes/quiz/useQuiz.js';
import { SummaryMode } from './modes/summary/SummaryMode.js';
import { ModalHost, type ActiveModal, type ModalRenderContext, type ModalTrigger } from '../../modals/index.js';
import { useSummary } from './modes/summary/useSummary.js';
import { THEME } from '../../shared/theme.js';
import { truncate } from '../../shared/text.js';
import { useAppKeys } from '../../shared/terminal/keymap.js';
import { PromptInput } from '../../shared/ui/PromptInput.js';
import { APP_VERSION } from '../../shared/metadata.js';

const SIDEBAR_WIDTH = 42;
const WIDE_TERMINAL_BREAKPOINT = 120;

const SESSION_MODES = ['Summary', 'Quiz', 'FlashCards', 'Exercises', 'AI Teacher'] as const;

interface SessionScreenProps {
  termWidth: number;
  termHeight: number;
  sessionId: string | null;
  prompt: string;
  presentation: SessionPresentation;
  commands: CommandModule[];
  commandContext: CommandContext;
  inputActive: boolean;
  modal: ActiveModal | null;
  modalContext: ModalRenderContext;
  modalTriggers: ModalTrigger[];
  onModalTrigger: (trigger: ModalTrigger) => void;
}

export const SessionScreen = ({
  termWidth,
  termHeight,
  sessionId,
  prompt,
  presentation,
  commands,
  commandContext,
  inputActive,
  modal,
  modalContext,
  modalTriggers,
  onModalTrigger,
}: SessionScreenProps) => {
  const [activeModeIndex, setActiveModeIndex] = React.useState(0);
  const [commandMenuActive, setCommandMenuActive] = React.useState(false);
  const sidebarVisible = termWidth > WIDE_TERMINAL_BREAKPOINT;
  const contentWidth = Math.max(1, termWidth - (sidebarVisible ? SIDEBAR_WIDTH : 0) - 4);
  const contentHeight = Math.max(4, termHeight - 7);
  const { summaryState, title } = useSummary({
    sessionId,
    prompt,
    modelProvider: presentation.modelProvider,
    model: presentation.model,
    reasoningEffort: presentation.reasoningEffort,
    materialPath: presentation.materialPath,
    studyLanguage: presentation.studyLanguage,
  });
  const { quizState, generateNewQuiz } = useQuiz({
    enabled: activeModeIndex === 1,
    sessionId,
    modelProvider: presentation.modelProvider,
    model: presentation.model,
    reasoningEffort: presentation.reasoningEffort,
    materialPath: presentation.materialPath,
    studyLanguage: presentation.studyLanguage,
  });

  const handleSessionSubmit = React.useCallback(() => {
    void commandContext.openModal('message', {
      title: 'Session Prompt',
      message: 'Follow-up prompts are not wired to study modes yet.',
    });
  }, [commandContext]);

  useAppKeys(
    ({ input, key }) => {
      if (key.ctrl && input === 'l') {
        setActiveModeIndex(current => (current + 1) % SESSION_MODES.length);
      }
    },
    { isActive: inputActive },
  );

  return (
    <box style={{ flexDirection: 'row', width: termWidth, height: termHeight, backgroundColor: THEME.background }}>
      <box style={{ flexGrow: 1, flexDirection: 'column', paddingLeft: 2, paddingRight: 2, paddingBottom: 1 }}>
        <box style={{ flexGrow: 1, flexDirection: 'column', width: contentWidth }}>
          <box style={{ height: 1, flexShrink: 0 }} />
          {activeModeIndex === 0 && (
            <SummaryMode
              contentWidth={contentWidth}
              contentHeight={contentHeight}
              summaryState={summaryState}
              inputActive={inputActive}
              commandMenuActive={commandMenuActive}
            />
          )}
          {activeModeIndex === 1 && (
            <QuizMode
              contentWidth={contentWidth}
              contentHeight={contentHeight}
              quizState={quizState}
              onNewRound={generateNewQuiz}
              onAction={(action, context) => {
                if (action === 'weak-spots') generateNewQuiz('weak-spots', context.weakTopics);
                if (action === 'raise-level') generateNewQuiz('raise-level');
                if (action === 'transfer') generateNewQuiz('transfer');
                if (action === 'exam') generateNewQuiz('exam');
              }}
              inputActive={inputActive}
              commandMenuActive={commandMenuActive}
            />
          )}
          {activeModeIndex > 1 && <ModePlaceholder name={SESSION_MODES[activeModeIndex] ?? 'Study mode'} />}
          <box style={{ flexGrow: 1 }} />
        </box>

        <box style={{ flexShrink: 0, flexDirection: 'column', width: contentWidth }}>
          <PromptInput
            onSubmit={handleSessionSubmit}
            commands={commands}
            commandContext={commandContext}
            width={contentWidth}
            inputActive={inputActive && activeModeIndex !== 1}
            modalTriggers={modalTriggers}
            onModalTrigger={onModalTrigger}
            placeholder="Ask anything..."
            subject={presentation.subject}
            subjectColor={presentation.subjectColor}
            showContextRow={false}
            onMenuVisibleChange={setCommandMenuActive}
          />

          <box style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <text fg={THEME.textMuted}> </text>
            <text fg={THEME.textMuted}>ctrl+c exit</text>
          </box>
        </box>
      </box>

      {sidebarVisible && (
        <box
          style={{
            width: SIDEBAR_WIDTH,
            height: '100%',
            flexDirection: 'column',
            backgroundColor: THEME.backgroundPanel,
            paddingTop: 1,
            paddingBottom: 1,
            paddingLeft: 2,
            paddingRight: 2,
          }}
        >
          <box style={{ flexGrow: 1, flexDirection: 'column', paddingRight: 1 }}>
            <SidebarSection title="Session">
              <text fg={THEME.text} attributes={TextAttributes.BOLD}>
                {title}
              </text>
              <text fg={THEME.textMuted}>Local study session</text>
            </SidebarSection>

            <SidebarSection title="Settings">
              <SidebarRow label="Subject" value={presentation.subject} valueColor={presentation.subjectColor} />
              <SidebarRow label="Provider" value={presentation.provider} />
              <SidebarRow label="Model" value={presentation.model} />
              <SidebarRow label="Reasoning" value={presentation.reasoningEffort} />
              <SidebarRow label="Material" value={presentation.material} />
              <SidebarRow label="Language" value={presentation.studyLanguage} />
            </SidebarSection>

            <SidebarSection title="Mode">
              <box style={{ flexDirection: 'column' }}>
                {SESSION_MODES.map((mode, index) => {
                  const active = index === activeModeIndex;

                  return (
                    <box
                      key={mode}
                      style={{
                        flexDirection: 'row',
                        backgroundColor: active ? presentation.subjectColor : undefined,
                        paddingLeft: 1,
                        paddingRight: 1,
                        justifyContent: 'space-between',
                      }}
                    >
                      <text
                        fg={active ? THEME.onAccent : THEME.textMuted}
                        attributes={active ? TextAttributes.BOLD : TextAttributes.NONE}
                      >
                        {mode}
                      </text>
                      {active && (
                        <text fg={THEME.onAccent} attributes={TextAttributes.BOLD}>
                          active
                        </text>
                      )}
                    </box>
                  );
                })}
              </box>
              <box style={{ marginTop: 1 }}>
                <text fg={THEME.textMuted}>ctrl+l next mode</text>
              </box>
            </SidebarSection>
          </box>

          <box style={{ flexShrink: 0, flexDirection: 'column', paddingTop: 1 }}>
            <text>
              <span fg={THEME.textMuted}>
                <span fg={THEME.success}>*</span>
                {' dir: '}
                {presentation.cwd}
              </span>
            </text>
            <text fg={THEME.textMuted}>{`OpenStudy ${APP_VERSION}`}</text>
          </box>
        </box>
      )}

      {modal && <ModalHost modal={modal} termWidth={termWidth} termHeight={termHeight} context={modalContext} />}
    </box>
  );
};

function ModePlaceholder({ name }: { name: string }) {
  return (
    <box style={{ marginTop: 1 }}>
      <text fg={THEME.textMuted}>{name}</text>
    </box>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <box style={{ flexDirection: 'column', marginBottom: 1 }}>
      <text fg={THEME.primary} attributes={TextAttributes.BOLD}>
        {title}
      </text>
      <box style={{ flexDirection: 'column', marginTop: 1 }}>{children}</box>
    </box>
  );
}

function SidebarRow({ label, value, valueColor = THEME.text }: { label: string; value: string; valueColor?: string }) {
  return (
    <box style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <text fg={THEME.textMuted}>{label}</text>
      <text fg={valueColor}>{truncate(value, 22)}</text>
    </box>
  );
}
