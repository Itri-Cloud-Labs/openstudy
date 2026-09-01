import React from 'react';
import { useTerminalDimensions } from '@opentui/react';

export interface TerminalSize {
  width: number;
  height: number;
}

export function useTerminalSize(): TerminalSize {
  const { width, height } = useTerminalDimensions();
  return React.useMemo(() => ({ width, height }), [width, height]);
}
