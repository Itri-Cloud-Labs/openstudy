#!/usr/bin/env node
import { render } from 'ink';
import { App } from './app/App.js';
import { closeProviders } from './providers/index.js';
import { isFirstLaunch } from './utils/config.js';

const ANSI_ENABLE_MOUSE_POINTER = '\x1b[?1000h\x1b[?1006h';
const ANSI_DISABLE_MOUSE_POINTER = '\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1005l\x1b[?1006l\x1b[?1015l\x1b[?1007l';

function writeTerminal(sequence: string): void {
  if (!process.stdout.isTTY || !process.stdout.writable) return;
  try {
    process.stdout.write(sequence);
  } catch {
    // Terminal restoration is best-effort during shutdown.
  }
}

let mousePointerEnabled = false;
let shuttingDown = false;
let unmountApp: (() => void) | undefined;

function enableDefaultMousePointer(): void {
  if (mousePointerEnabled || shuttingDown) return;
  writeTerminal(ANSI_ENABLE_MOUSE_POINTER);
  mousePointerEnabled = true;
}

function restoreMousePointer(): void {
  writeTerminal(ANSI_DISABLE_MOUSE_POINTER);
  mousePointerEnabled = false;
}

function shutdownApp(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  void closeProviders();
  unmountApp?.();
  restoreMousePointer();
}

function exitApp(code: number): never {
  shutdownApp();
  process.exit(code);
}

function registerProcessHandlers(): void {
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.once(signal, () => exitApp(0));
  }

  process.once('uncaughtException', error => {
    shutdownApp();
    throw error;
  });
  process.once('unhandledRejection', error => {
    shutdownApp();
    throw error;
  });
  process.once('beforeExit', restoreMousePointer);
  process.once('exit', restoreMousePointer);
}

const firstLaunch = isFirstLaunch();
restoreMousePointer();
registerProcessHandlers();

const { unmount } = render(<App firstLaunch={firstLaunch} onExit={() => shutdownApp()} />, {
  alternateScreen: true,
  onRender: enableDefaultMousePointer,
});

unmountApp = unmount;
