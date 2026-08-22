import React from 'react';
import { TextAttributes } from '@opentui/core';
import type { CommandContext, CommandModule } from '../../commands/index.js';
import type { ModalTrigger } from '../../modals/index.js';
import { useBlinkCursor } from '../hooks/useBlinkCursor.js';
import { truncate } from '../text.js';
import { useAppKeys } from '../terminal/keymap.js';
import { getCommandSuggestions, wrapInput } from './prompt-model.js';
import type { AppKey } from '../terminal/keymap.js';
import { THEME } from '../theme.js';

const ACCENT_WIDTH = 1;
const INPUT_PADDING_X = 2;
const MIN_INPUT_LINES = 1;
const MAX_VISIBLE_INPUT_LINES = 10;
const MAX_MENU_ITEMS = 10;

// Side-less single border: only the left/right vertical rails are drawn.
const RAIL_BORDER = {
  topLeft: ' ',
  topRight: ' ',
  bottomLeft: ' ',
  bottomRight: ' ',
  horizontal: ' ',
  vertical: '│',
  topT: ' ',
  bottomT: ' ',
  leftT: ' ',
  rightT: ' ',
  cross: ' ',
};

interface PromptInputProps {
  onSubmit: (v: string) => void;
  commands: CommandModule[];
  commandContext: CommandContext;
  width: number;
  inputActive?: boolean;
  modalTriggers?: ModalTrigger[];
  onModalTrigger?: (trigger: ModalTrigger) => void;
  placeholder?: string;
  subject?: string;
  subjectColor?: string;
  model?: string;
  reasoningEffort?: string;
  material?: string;
  studyLanguage?: string;
  showContextRow?: boolean;
  onMenuVisibleChange?: (visible: boolean) => void;
}

export const PromptInput = ({
  onSubmit,
  commands,
  commandContext,
  width,
  inputActive = true,
  modalTriggers = [],
  onModalTrigger,
  placeholder = 'Ask anything...',
  subject = 'Subject',
  subjectColor = '#3b82f6',
  model = 'Model',
  reasoningEffort = 'Reasoning effort',
  material = 'Material',
  studyLanguage = 'Study Language',
  showContextRow = true,
  onMenuVisibleChange,
}: PromptInputProps) => {
  const [value, setValue] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const cursorVisible = useBlinkCursor();
  const [menuDismissed, setMenuDismissed] = React.useState(false);

  const slashEligible = value.startsWith('/') && !/\s/.test(value);
  const commandQuery = slashEligible ? value.slice(1).toLowerCase() : null;

  React.useEffect(() => {
    setMenuDismissed(false);
  }, [value]);

  const suggestions = React.useMemo(() => {
    if (commandQuery === null) return [];
    return getCommandSuggestions(commands, commandQuery, MAX_MENU_ITEMS);
  }, [commandQuery, commands]);
  const menuVisible = slashEligible && !menuDismissed;

  React.useEffect(() => {
    onMenuVisibleChange?.(menuVisible);
  }, [menuVisible, onMenuVisibleChange]);
  const menuItems = menuVisible ? suggestions : [];
  const menuRowCount = Math.max(1, menuItems.length);
  const menuTop = -menuRowCount;
  const menuInnerWidth = Math.max(1, width - 4);
  const commandWidth = Math.max(0, ...commands.map(command => command.config.name.length + 1)) + 2;

  React.useEffect(() => {
    setSelectedIndex(current => {
      if (menuItems.length === 0) return 0;
      return Math.min(current, menuItems.length - 1);
    });
  }, [menuItems]);

  const applySuggestion = React.useCallback(
    (index: number) => {
      const suggestion = menuItems[index];
      if (!suggestion) return;
      setValue(`/${suggestion.config.name} `);
      setSelectedIndex(index);
      setMenuDismissed(true);
    },
    [menuItems],
  );

  const executeCommand = React.useCallback(
    (command: CommandModule) => {
      void command.execute(commandContext);
      setValue('');
      setSelectedIndex(0);
      setMenuDismissed(false);
    },
    [commandContext],
  );

  const matchingModalTrigger = React.useCallback(
    (input: string, key: AppKey) => {
      return modalTriggers.find(trigger => {
        if (trigger.tab) return key.tab;
        if (trigger.ctrl) return key.ctrl && input === trigger.input;
        return input === trigger.input;
      });
    },
    [modalTriggers],
  );

  useAppKeys(
    ({ input, key }) => {
      if (menuVisible && menuItems.length > 0 && (key.upArrow || (key.ctrl && input === 'p'))) {
        setSelectedIndex(current => (current - 1 + menuItems.length) % menuItems.length);
        return;
      }
      if (menuVisible && menuItems.length > 0 && (key.downArrow || (key.ctrl && input === 'n'))) {
        setSelectedIndex(current => (current + 1) % menuItems.length);
        return;
      }
      if (menuVisible && menuItems.length > 0 && key.tab) {
        applySuggestion(selectedIndex);
        return;
      }
      const modalTrigger =
        matchingModalTrigger(input, key) ??
        (key.return && value.length === 0
          ? modalTriggers.find(trigger => trigger.ctrl && trigger.input === 'm')
          : undefined);
      if (modalTrigger) {
        onModalTrigger?.(modalTrigger);
        return;
      }
      if (menuVisible && key.escape) {
        setMenuDismissed(true);
        return;
      }
      if (key.return) {
        const trimmed = value.trim();
        if (menuVisible && menuItems.length > 0) {
          const command = menuItems[selectedIndex];
          if (command) executeCommand(command);
          return;
        }
        if (trimmed.startsWith('/')) {
          const name = trimmed.slice(1).split(/\s+/, 1)[0];
          const command = commands.find(item => item.config.name === name);
          if (command) {
            executeCommand(command);
            return;
          }
        }
        if (trimmed) {
          onSubmit(trimmed);
          setValue('');
          setSelectedIndex(0);
          setMenuDismissed(false);
        }
        return;
      }
      if (key.backspace || key.delete) {
        setValue(current => current.slice(0, -1));
        return;
      }
      if (
        key.upArrow ||
        key.downArrow ||
        key.leftArrow ||
        key.rightArrow ||
        key.pageUp ||
        key.pageDown ||
        key.home ||
        key.end
      )
        return;
      if (key.ctrl || key.meta || key.escape || key.tab) return;
      if (input) setValue(current => current + input);
    },
    { isActive: inputActive },
  );

  const isPlaceholder = value.length === 0;
  const contentWidth = Math.max(1, width - ACCENT_WIDTH - INPUT_PADDING_X * 2);

  const visibleLines = React.useMemo(() => {
    if (isPlaceholder) return [];

    const lines = wrapInput(value, contentWidth);
    const lastLine = lines[lines.length - 1] ?? '';

    if (value.length > 0 && lastLine.length === contentWidth) {
      lines.push('');
    }

    return lines.slice(-MAX_VISIBLE_INPUT_LINES);
  }, [contentWidth, isPlaceholder, value]);

  const cursor = cursorVisible ? '█' : ' ';
  const placeholderCursor = cursorVisible ? cursor : (placeholder[0] ?? ' ');

  return (
    <box style={{ flexDirection: 'column', width }}>
      {menuVisible && (
        <box
          style={{
            position: 'absolute',
            top: menuTop,
            left: 0,
            width,
            flexDirection: 'column',
            borderStyle: 'single',
            borderColor: THEME.rule,
            customBorderChars: RAIL_BORDER,
            backgroundColor: THEME.backgroundPanel,
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          {menuItems.length === 0 ? (
            <box style={{ paddingLeft: 1, paddingRight: 1, width: '100%' }}>
              <text fg={THEME.textMuted}>No matching commands</text>
            </box>
          ) : (
            menuItems.map((suggestion, index) => {
              const isSelected = index === selectedIndex;
              const remaining = Math.max(0, menuInnerWidth - commandWidth);
              const description = truncate(suggestion.config.description, remaining, '…');

              return (
                <box
                  key={suggestion.config.name}
                  style={{
                    paddingLeft: 1,
                    paddingRight: 1,
                    width: '100%',
                    backgroundColor: isSelected ? subjectColor : undefined,
                  }}
                >
                  <text>
                    <span
                      fg={isSelected ? THEME.onAccent : THEME.text}
                      attributes={isSelected ? TextAttributes.BOLD : TextAttributes.NONE}
                    >
                      {`/${suggestion.config.name}`.padEnd(commandWidth)}
                    </span>
                    <span fg={isSelected ? THEME.onAccent : THEME.textMuted}>{description}</span>
                  </text>
                </box>
              );
            })
          )}
        </box>
      )}

      <box style={{ flexDirection: 'row', width, backgroundColor: THEME.backgroundRaised }}>
        <box style={{ width: ACCENT_WIDTH, height: '100%', backgroundColor: subjectColor }} />

        <box
          style={{
            flexDirection: 'column',
            flexGrow: 1,
            paddingLeft: INPUT_PADDING_X,
            paddingRight: INPUT_PADDING_X,
            paddingTop: 1,
            paddingBottom: 1,
          }}
        >
          <box style={{ marginBottom: 1, minHeight: MIN_INPUT_LINES, flexDirection: 'column' }}>
            {isPlaceholder ? (
              <text>
                <span fg={cursorVisible ? THEME.text : THEME.textMuted}>{placeholderCursor}</span>
                <span fg={THEME.textMuted}>{placeholder.slice(1)}</span>
              </text>
            ) : (
              visibleLines.map((line, index) => {
                const isLastLine = index === visibleLines.length - 1;

                return (
                  <text key={`${index}:${line}`}>
                    <span fg={THEME.text}>{line}</span>
                    {isLastLine && <span fg={THEME.text}>{cursor}</span>}
                  </text>
                );
              })
            )}
          </box>

          {showContextRow && (
            <box style={{ flexDirection: 'row' }}>
              <text>
                <span fg={subjectColor} attributes={TextAttributes.BOLD}>
                  {subject}
                </span>
                <span fg={THEME.rule}> · </span>
                <span fg={THEME.textMuted}>{model}</span>
                <span fg={THEME.rule}> · </span>
                <span fg={THEME.primary} attributes={TextAttributes.BOLD}>
                  {reasoningEffort}
                </span>
                <span fg={THEME.rule}> · </span>
                <span fg={THEME.textMuted}>{material}</span>
                <span fg={THEME.rule}> · </span>
                <span fg={THEME.textMuted}>{studyLanguage}</span>
              </text>
            </box>
          )}
        </box>
      </box>
    </box>
  );
};
