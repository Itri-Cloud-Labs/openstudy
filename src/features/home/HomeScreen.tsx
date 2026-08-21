import { Box, Text } from 'ink';
import type { CommandContext, CommandModule } from '../../commands/index.js';
import { Logo } from '../../shared/ui/Logo.js';
import { PromptInput } from '../../shared/ui/PromptInput.js';
import { ModalHost } from '../../modals/ModalHost.js';
import type { ActiveModal, ModalRenderContext, ModalTrigger } from '../../modals/types.js';
import { APP_VERSION } from '../../shared/metadata.js';
import { THEME } from '../../shared/theme.js';
import type { SessionPresentation } from '../session-presentation.js';

export interface HomePresentation extends SessionPresentation {
  tip: string;
}

export interface HomeInputBindings {
  commands: CommandModule[];
  commandContext: CommandContext;
  active: boolean;
  triggers: ModalTrigger[];
  onTrigger: (trigger: ModalTrigger) => void;
  onSubmit: (value: string) => void;
}

export interface HomeOverlay {
  modal: ActiveModal | null;
  context: ModalRenderContext;
}

export interface HomeScreenProps {
  width: number;
  height: number;
  promptWidth: number;
  presentation: HomePresentation;
  input: HomeInputBindings;
  overlay: HomeOverlay;
}

export function HomeScreen({ width, height, promptWidth, presentation, input, overlay }: HomeScreenProps) {
  const contentHeight = 16;
  const topPadding = Math.max(2, Math.floor((height - contentHeight) / 2));

  return (
    <Box flexDirection="column" width={width} height={height} backgroundColor={THEME.background}>
      <Box height={topPadding} flexShrink={0} />

      <Box justifyContent="center" marginBottom={2}>
        <Logo />
      </Box>

      <Box justifyContent="center">
        <PromptInput
          onSubmit={input.onSubmit}
          commands={input.commands}
          commandContext={input.commandContext}
          width={promptWidth}
          inputActive={input.active}
          modalTriggers={input.triggers}
          onModalTrigger={input.onTrigger}
          placeholder={`Not sure what to ask ? Just say Hi and ${presentation.modelLabel} will guide you`}
          subject={presentation.subject}
          subjectColor={presentation.subjectColor}
          model={presentation.modelLabel}
          reasoningEffort={presentation.reasoningEffort}
          material={presentation.material}
          studyLanguage={presentation.studyLanguage}
        />
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Box width={promptWidth} justifyContent="flex-end">
          <Text dimColor>
            <Text color={THEME.text}>tab</Text>
            <Text color={THEME.textFaint}> subject </Text>
            <Text color={THEME.text}>ctrl+m</Text>
            <Text color={THEME.textFaint}> model </Text>
            <Text color={THEME.text}>ctrl+r</Text>
            <Text color={THEME.textFaint}> reasoning </Text>
            <Text color={THEME.text}>ctrl+f</Text>
            <Text color={THEME.textFaint}> material </Text>
            <Text color={THEME.text}>ctrl+l</Text>
            <Text color={THEME.textFaint}> language</Text>
          </Text>
        </Box>
      </Box>

      <Box justifyContent="center" marginTop={2}>
        <Box width={promptWidth}>
          <Text color={THEME.primary}>{'● '}</Text>
          <Text color={THEME.primary} bold>
            Tip
          </Text>
          <Text color={THEME.textFaint}>{` ${presentation.tip}`}</Text>
        </Box>
      </Box>

      <Box flexGrow={1} />

      <Box flexDirection="row" justifyContent="space-between" paddingX={2}>
        <Text color={THEME.textFaint}>{presentation.cwd}</Text>
        <Text color={THEME.textFaint}>{APP_VERSION}</Text>
      </Box>

      {overlay.modal && (
        <ModalHost modal={overlay.modal} termWidth={width} termHeight={height} context={overlay.context} />
      )}
    </Box>
  );
}
