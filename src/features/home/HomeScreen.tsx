import { Box, Text } from 'ink';
import type { CommandContext, CommandModule } from '../../commands/index.js';
import { Logo } from '../../shared/ui/Logo.js';
import { PromptInput } from '../../shared/ui/PromptInput.js';
import { ModalHost } from '../../modals/ModalHost.js';
import type { ActiveModal, ModalRenderContext, ModalTrigger } from '../../modals/types.js';
import { APP_VERSION } from '../../shared/metadata.js';

export interface HomePresentation {
  subject: string;
  subjectColor: string;
  model: string;
  reasoningEffort: string;
  material: string;
  studyLanguage: string;
  cwd: string;
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
    <Box flexDirection="column" width={width} height={height} backgroundColor="#000000">
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
          placeholder={`Not sure what to ask ? Just say Hi and ${presentation.model} will guide you`}
          subject={presentation.subject}
          subjectColor={presentation.subjectColor}
          model={presentation.model}
          reasoningEffort={presentation.reasoningEffort}
          material={presentation.material}
          studyLanguage={presentation.studyLanguage}
        />
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Box width={promptWidth} justifyContent="flex-end">
          <Text dimColor>
            <Text color="#cccccc">tab</Text>
            <Text color="#555555"> subject </Text>
            <Text color="#cccccc">ctrl+m</Text>
            <Text color="#555555"> model </Text>
            <Text color="#cccccc">ctrl+r</Text>
            <Text color="#555555"> reasoning </Text>
            <Text color="#cccccc">ctrl+f</Text>
            <Text color="#555555"> material </Text>
            <Text color="#cccccc">ctrl+l</Text>
            <Text color="#555555"> language</Text>
          </Text>
        </Box>
      </Box>

      <Box justifyContent="center" marginTop={2}>
        <Box width={promptWidth}>
          <Text color="#f0a500">{'● '}</Text>
          <Text color="#f0a500" bold>
            Tip
          </Text>
          <Text color="#555555">{` ${presentation.tip}`}</Text>
        </Box>
      </Box>

      <Box flexGrow={1} />

      <Box flexDirection="row" justifyContent="space-between" paddingX={2}>
        <Text color="#444444">{presentation.cwd}</Text>
        <Text color="#444444">{APP_VERSION}</Text>
      </Box>

      {overlay.modal && (
        <ModalHost modal={overlay.modal} termWidth={width} termHeight={height} context={overlay.context} />
      )}
    </Box>
  );
}
