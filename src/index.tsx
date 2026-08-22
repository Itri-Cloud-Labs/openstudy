#!/usr/bin/env bun
import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { App } from './app/App.js';
import { closeProviders } from './providers/index.js';
import { THEME } from './shared/theme.js';
import { isFirstLaunch } from './utils/config.js';

const firstLaunch = isFirstLaunch();

let shuttingDown = false;
let renderer: Awaited<ReturnType<typeof createCliRenderer>> | undefined;

function shutdownApp(code?: number): never {
  if (shuttingDown) process.exit(code ?? 0);
  shuttingDown = true;

  void closeProviders();
  renderer?.destroy();
  process.exit(code ?? 0);
}

function registerProcessHandlers(): void {
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.once(signal, () => shutdownApp(0));
  }

  process.once('uncaughtException', error => {
    shutdownApp(1);
    throw error;
  });
  process.once('unhandledRejection', error => {
    shutdownApp(1);
    throw error;
  });
}

registerProcessHandlers();

renderer = await createCliRenderer({
  // The renderer owns the alternate screen, mouse reporting, and terminal
  // restoration; the app only owns provider cleanup and exit semantics.
  screenMode: 'alternate-screen',
  backgroundColor: THEME.background,
  // ctrl+c is handled by the app: it closes an open modal first and exits
  // from the home/session prompt.
  exitOnCtrlC: false,
});

createRoot(renderer).render(<App firstLaunch={firstLaunch} onExit={() => shutdownApp(0)} />);
