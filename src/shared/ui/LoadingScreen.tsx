import React from 'react';
import { TextAttributes } from '@opentui/core';
import { Logo } from './Logo.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { THEME } from '../theme.js';

const LOADING_FRAMES = ['|', '/', '-', '\\'];
const TROLL_MESSAGES = [
  'Convincing the pencils to stop unionizing...',
  'Sharpening PDFs with a butter knife...',
  'Teaching the loading bar to read...',
  'Asking the mitochondria for extra power...',
  'Pretending this is very scientific...',
];

interface LoadingScreenProps {
  firstLaunch?: boolean;
  preloadReady?: boolean;
}

export const LoadingScreen = ({ firstLaunch = false, preloadReady = false }: LoadingScreenProps) => {
  const terminal = useTerminalSize();
  const [frame, setFrame] = React.useState(0);
  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setFrame(current => (current + 1) % LOADING_FRAMES.length);
    }, 120);

    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!firstLaunch || !preloadReady) return;

    const id = setInterval(() => {
      setMessageIndex(current => (current + 1) % TROLL_MESSAGES.length);
    }, 1000);

    return () => clearInterval(id);
  }, [firstLaunch, preloadReady]);

  return (
    <box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: terminal.width,
        height: terminal.height,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.background,
        zIndex: 50,
      }}
    >
      <box style={{ marginBottom: 2 }}>
        <Logo />
      </box>
      <text fg={THEME.primary} attributes={TextAttributes.BOLD}>
        {`${LOADING_FRAMES[frame]} Loading OpenStudy`}
      </text>
      <text fg={THEME.textFaint}>
        {firstLaunch && preloadReady ? TROLL_MESSAGES[messageIndex] : 'Preparing commands and modals...'}
      </text>
    </box>
  );
};
