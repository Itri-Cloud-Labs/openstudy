import { TextAttributes } from '@opentui/core';
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
    <box style={{ flexDirection: 'column', width, height, backgroundColor: THEME.background }}>
      <box style={{ height: topPadding, flexShrink: 0 }} />

      <box style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 2 }}>
        <Logo />
      </box>

      <box style={{ flexDirection: 'row', justifyContent: 'center' }}>
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
      </box>

      <box style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 1 }}>
        <box style={{ width: promptWidth, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <text>
            <span fg={THEME.text}>tab</span>
            <span fg={THEME.textFaint}> subject </span>
            <span fg={THEME.text}>ctrl+m</span>
            <span fg={THEME.textFaint}> model </span>
            <span fg={THEME.text}>ctrl+r</span>
            <span fg={THEME.textFaint}> reasoning </span>
            <span fg={THEME.text}>ctrl+f</span>
            <span fg={THEME.textFaint}> material </span>
            <span fg={THEME.text}>ctrl+l</span>
            <span fg={THEME.textFaint}> language</span>
          </text>
        </box>
      </box>

      <box style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 2 }}>
        <box style={{ width: promptWidth, flexDirection: 'row' }}>
          <text>
            <span fg={THEME.primary}>{'● '}</span>
            <span fg={THEME.primary} attributes={TextAttributes.BOLD}>
              Tip
            </span>
            <span fg={THEME.textFaint}>{` ${presentation.tip}`}</span>
          </text>
        </box>
      </box>

      <box style={{ flexGrow: 1 }} />

      <box style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 2, paddingRight: 2 }}>
        <text fg={THEME.textFaint}>{presentation.cwd}</text>
        <text fg={THEME.textFaint} attributes={TextAttributes.DIM}>
          {APP_VERSION}
        </text>
      </box>

      {overlay.modal && (
        <ModalHost modal={overlay.modal} termWidth={width} termHeight={height} context={overlay.context} />
      )}
    </box>
  );
}
