import React from 'react';
import { useStdout } from 'ink';

export interface TerminalSize {
  width: number;
  height: number;
}

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const measure = React.useCallback(
    () => ({
      width: stdout?.columns ?? process.stdout.columns ?? 80,
      height: stdout?.rows ?? process.stdout.rows ?? 24,
    }),
    [stdout],
  );
  const [size, setSize] = React.useState<TerminalSize>(measure);

  React.useEffect(() => {
    const update = () => setSize(measure());
    update();
    stdout?.on('resize', update);
    if (stdout !== process.stdout) process.stdout.on('resize', update);

    return () => {
      stdout?.off('resize', update);
      if (stdout !== process.stdout) process.stdout.off('resize', update);
    };
  }, [measure, stdout]);

  return size;
}
