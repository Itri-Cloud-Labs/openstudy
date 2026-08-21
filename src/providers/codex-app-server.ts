import { spawn, type ChildProcess } from 'node:child_process';
import { createProviderAbortError } from './errors.js';

export interface CodexAppServerNotification {
  method: string;
  params: unknown;
}

interface PendingRequest {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

type NotificationListener = (notification: CodexAppServerNotification) => void;
type CloseListener = (error: Error) => void;

interface JsonRpcErrorResponse {
  error?: { message?: unknown };
}

const CODEX_BINARY = 'codex';
const SPAWN_FAILED_MESSAGE = 'The Codex CLI (`codex`) is not installed or not on PATH.';

function toRpcErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const message = (payload as JsonRpcErrorResponse).error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

/**
 * Minimal NDJSON JSON-RPC 2.0 client for a `codex app-server` child process.
 * Requests are correlated by incrementing ids; server-initiated messages
 * without an id are forwarded to notification listeners, and transport
 * failures are reported to close listeners.
 */
export class CodexAppServer {
  private child: ChildProcess | null = null;
  private buffer = '';
  private nextRequestId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly notificationListeners = new Set<NotificationListener>();
  private readonly closeListeners = new Set<CloseListener>();
  private stderrTail = '';

  static spawn(binary = CODEX_BINARY, args: string[] = ['app-server']): CodexAppServer {
    const client = new CodexAppServer();
    client.start(binary, args);
    return client;
  }

  private start(binary: string, args: string[]): void {
    let child: ChildProcess;
    try {
      child = spawn(binary, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      throw new Error(SPAWN_FAILED_MESSAGE);
    }
    this.child = child;

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', chunk => this.handleOutput(chunk));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', chunk => {
      this.stderrTail = `${this.stderrTail}${chunk}`.slice(-2000);
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      this.failAll(error.code === 'ENOENT' ? new Error(SPAWN_FAILED_MESSAGE) : new Error(error.message));
    });
    child.on('close', exitCode => {
      this.child = null;
      this.failAll(
        new Error(
          `The Codex app-server exited unexpectedly (code ${exitCode ?? 'unknown'}).${this.stderrTail.trim() ? ` Last output: ${this.stderrTail.trim()}` : ''}`,
        ),
      );
    });
  }

  addNotificationListener(listener: NotificationListener): void {
    this.notificationListeners.add(listener);
  }

  removeNotificationListener(listener: NotificationListener): void {
    this.notificationListeners.delete(listener);
  }

  addCloseListener(listener: CloseListener): void {
    this.closeListeners.add(listener);
  }

  removeCloseListener(listener: CloseListener): void {
    this.closeListeners.delete(listener);
  }

  notify(method: string, params?: unknown): void {
    this.write({ method, ...(params === undefined ? {} : { params }) });
  }

  request(method: string, params?: unknown, signal?: AbortSignal): Promise<unknown> {
    throwIfAborted(signal);
    const id = this.nextRequestId++;
    const abortSignal = signal;
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: (value: unknown) => void, value: unknown) => {
        if (settled) return;
        settled = true;
        this.pending.delete(id);
        signal?.removeEventListener('abort', onAbort);
        fn(value);
      };
      const pending: PendingRequest = {
        method,
        resolve: value => settle(resolve, value),
        reject: error => settle(reject, error),
      };
      const onAbort = () => {
        this.pending.delete(id);
        pending.reject(createProviderAbortError(abortSignal?.reason));
      };

      this.pending.set(id, pending);
      signal?.addEventListener('abort', onAbort, { once: true });
      if (!this.write({ id, method, ...(params === undefined ? {} : { params }) })) {
        pending.reject(new Error('The Codex app-server connection is not available.'));
      }
    });
  }

  async dispose(): Promise<void> {
    const child = this.child;
    this.child = null;
    this.failAll(new Error('The Codex app-server connection was closed.'));
    if (!child) return;
    child.removeAllListeners();
    child.stdout?.destroy();
    child.stderr?.destroy();
    child.stdin?.end();
    await new Promise<void>(resolve => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 2000);
      child.once('close', () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill();
    });
  }

  private write(message: Record<string, unknown>): boolean {
    if (!this.child?.stdin?.writable) return false;
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
    return true;
  }

  private handleOutput(chunk: string): void {
    this.buffer += chunk;
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.trim()) this.handleLine(line);
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  private handleLine(line: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(line) as Record<string, unknown>;
    } catch {
      return;
    }

    if (typeof message.id === 'number' || typeof message.id === 'string') {
      const pending = this.pending.get(Number(message.id));
      if (!pending) return;
      this.pending.delete(Number(message.id));
      if (message.error !== undefined && message.error !== null) {
        pending.reject(new Error(toRpcErrorMessage(message, `Codex ${pending.method} failed.`)));
        return;
      }
      pending.resolve(message.result);
      return;
    }

    if (typeof message.method === 'string') {
      const notification = { method: message.method, params: message.params };
      for (const listener of [...this.notificationListeners]) listener(notification);
    }
  }

  private failAll(error: Error): void {
    const requests = [...this.pending.values()];
    this.pending.clear();
    for (const request of requests) request.reject(error);
    for (const listener of [...this.closeListeners]) listener(error);
    this.closeListeners.clear();
    this.notificationListeners.clear();
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw createProviderAbortError(signal.reason);
}
