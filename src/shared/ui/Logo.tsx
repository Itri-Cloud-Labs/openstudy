import React from 'react';
import { TextAttributes } from '@opentui/core';
import { THEME } from '../theme.js';

// Pre-split ASCII art. Each line is sliced at column 21 where "Study" begins.
// "Open" portion → dim gray, "Study" portion → bright white.
const LINES: [string, string][] = [
  ['   ___                   ', '____  _             _       '],
  ['  / _ \\ _ __   ___ _ __ ', '/ ___|| |_ _   _  __| |_   _ '],
  [" | | | | '_ \\ / _ \\ '_ \\\\", '___ \\| __| | | |/ _` | | | |'],
  [' | |_| | |_) |  __/ | | |', '__) | |_| |_| | (_| | |_| |'],
  ['  \\___/| .__/ \\___|_| |_|', '___/ \\__|\\__,_|\\__,_|\\__, |'],
  ['       |_|               ', '                      |___/ '],
];

export const Logo = React.memo(() => (
  <box style={{ flexDirection: 'column' }}>
    {LINES.map(([open, study]) => (
      <text key={`${open}:${study}`}>
        <span fg={THEME.textFaint}>{open}</span>
        <span fg={THEME.text} attributes={TextAttributes.BOLD}>
          {study}
        </span>
      </text>
    ))}
  </box>
));
