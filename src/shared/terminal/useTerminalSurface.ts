import React from 'react';
import { useStdout } from 'ink';

const ANSI_BACKGROUND_BLACK = '\x1b[40m';
const ANSI_BACKGROUND_DEFAULT = '\x1b[49m';
const ANSI_CLEAR = '\x1b[2J\x1b[H';

export function useTerminalSurface(): void {
  const { stdout } = useStdout();

  React.useEffect(() => {
    stdout?.write(ANSI_BACKGROUND_BLACK + ANSI_CLEAR);
    return () => {
      stdout?.write(ANSI_BACKGROUND_DEFAULT);
    };
  }, [stdout]);
}
