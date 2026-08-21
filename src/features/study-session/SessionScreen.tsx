import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { CommandContext, CommandModule } from '../../commands/index.js';
import type { SessionPresentation } from '../session-presentation.js';
import { SummaryMode, type ModeProps, type SummaryModeProps } from './modes/summary/SummaryMode.js';
import { ModalHost, type ActiveModal, type ModalRenderContext, type ModalTrigger } from '../../modals/index.js';
import { useSummary } from './modes/summary/useSummary.js';
import { THEME } from '../../shared/theme.js';
import { truncate } from '../../shared/text.js';
import { isTerminalMouseReport } from '../../utils/input.js';
import { PromptInput } from '../../shared/ui/PromptInput.js';
import { APP_VERSION } from '../../shared/metadata.js';

const SIDEBAR_WIDTH = 42;
const WIDE_TERMINAL_BREAKPOINT = 120;

interface SessionModeDefinition {
  label: string;
  Component: React.ComponentType<SummaryModeProps>;
}

const SESSION_MODES: readonly SessionModeDefinition[] = [
  { label: 'Summary', Component: SummaryMode },
  { label: 'Quiz', Component: QuizMode },
  { label: 'FlashCards', Component: FlashCardsMode },
  { label: 'Exercises', Component: ExercisesMode },
  { label: 'AI Teacher', Component: AiTeacherMode },
];

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

export const SessionScreen: React.FC<SessionScreenProps> = ({
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
}) => {
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
  const ActiveMode = SESSION_MODES[activeModeIndex]?.Component ?? SummaryMode;

  const handleSessionSubmit = React.useCallback(() => {
    void commandContext.openModal('message', {
      title: 'Session Prompt',
      message: 'Follow-up prompts are not wired to study modes yet.',
    });
  }, [commandContext]);

  useInput(
    (input, key) => {
      if (isTerminalMouseReport(input)) return;

      if (key.ctrl && input === 'l') {
        setActiveModeIndex(current => (current + 1) % SESSION_MODES.length);
      }
    },
    { isActive: inputActive },
  );

  return (
    <Box flexDirection="row" width={termWidth} height={termHeight} backgroundColor={THEME.background}>
      <Box flexGrow={1} flexDirection="column" paddingLeft={2} paddingRight={2} paddingBottom={1}>
        <Box flexGrow={1} flexDirection="column" width={contentWidth}>
          <Box height={1} flexShrink={0} />
          <ActiveMode
            contentWidth={contentWidth}
            contentHeight={contentHeight}
            summaryState={summaryState}
            inputActive={inputActive}
            commandMenuActive={commandMenuActive}
          />
          <Box flexGrow={1} />
        </Box>

        <Box flexShrink={0} flexDirection="column" width={contentWidth}>
          <PromptInput
            onSubmit={handleSessionSubmit}
            commands={commands}
            commandContext={commandContext}
            width={contentWidth}
            inputActive={inputActive}
            modalTriggers={modalTriggers}
            onModalTrigger={onModalTrigger}
            placeholder="Ask anything..."
            subject={presentation.subject}
            subjectColor={presentation.subjectColor}
            showContextRow={false}
            onMenuVisibleChange={setCommandMenuActive}
          />

          <Box flexDirection="row" justifyContent="space-between">
            <Text color={THEME.textMuted}> </Text>
            <Text color={THEME.textMuted}>ctrl+c exit</Text>
          </Box>
        </Box>
      </Box>

      {sidebarVisible && (
        <Box
          width={SIDEBAR_WIDTH}
          height="100%"
          flexDirection="column"
          backgroundColor={THEME.backgroundPanel}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          paddingRight={2}
        >
          <Box flexGrow={1} flexDirection="column" paddingRight={1}>
            <SidebarSection title="Session">
              <Text color={THEME.text} bold>
                {title}
              </Text>
              <Text color={THEME.textMuted}>Local study session</Text>
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
              <Box flexDirection="column">
                {SESSION_MODES.map((mode, index) => {
                  const active = index === activeModeIndex;

                  return (
                    <Box
                      key={mode.label}
                      backgroundColor={active ? presentation.subjectColor : undefined}
                      paddingX={1}
                      justifyContent="space-between"
                    >
                      <Text color={active ? THEME.onAccent : THEME.textMuted} bold={active}>
                        {mode.label}
                      </Text>
                      {active && (
                        <Text color={THEME.onAccent} bold>
                          active
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </Box>
              <Box marginTop={1}>
                <Text color={THEME.textMuted}>ctrl+l next mode</Text>
              </Box>
            </SidebarSection>
          </Box>

          <Box flexShrink={0} flexDirection="column" paddingTop={1}>
            <Text color={THEME.textMuted}>
              <Text color={THEME.success}>*</Text>
              {' dir: '}
              {presentation.cwd}
            </Text>
            <Text color={THEME.textMuted}>OpenStudy {APP_VERSION}</Text>
          </Box>
        </Box>
      )}

      {modal && <ModalHost modal={modal} termWidth={termWidth} termHeight={termHeight} context={modalContext} />}
    </Box>
  );
};

function QuizMode(_props: ModeProps) {
  return <ModePlaceholder name="Quiz" />;
}

function FlashCardsMode(_props: ModeProps) {
  return <ModePlaceholder name="FlashCards" />;
}

function ExercisesMode(_props: ModeProps) {
  return <ModePlaceholder name="Exercises" />;
}

function AiTeacherMode(_props: ModeProps) {
  return <ModePlaceholder name="AI Teacher" />;
}

function ModePlaceholder({ name }: { name: string }) {
  return (
    <Box marginTop={1}>
      <Text color={THEME.textMuted}>{name}</Text>
    </Box>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={THEME.primary} bold>
        {title}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {children}
      </Box>
    </Box>
  );
}

function SidebarRow({ label, value, valueColor = THEME.text }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box justifyContent="space-between">
      <Text color={THEME.textMuted}>{label}</Text>
      <Text color={valueColor}>{truncate(value, 22)}</Text>
    </Box>
  );
}
