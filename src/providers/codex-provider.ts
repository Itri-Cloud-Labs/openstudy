import path from 'node:path';
import { CodexAppServer, type CodexAppServerNotification } from './codex-app-server.js';
import { APP_VERSION } from '../shared/metadata.js';
import type { ProviderModelOption, ProviderPromptOptions, ProviderPromptResult, StudyProvider } from './contracts.js';
import { createProviderAbortError, normalizeProviderError, throwIfProviderAborted } from './errors.js';
import { buildMaterialPrompt, isRemoteMaterial, resolvePromptFiles } from './material-prompt.js';

export const CODEX_LOGIN_REQUIRED_MESSAGE = [
  'Codex is not logged in on this machine.',
  'Please run `codex login` in a terminal window, then come back.',
].join(' ');

const CLIENT_INFO = { name: 'openstudy', title: 'OpenStudy', version: APP_VERSION };
const APPROVAL_POLICY = 'never';
const SANDBOX_MODE = 'read-only';
const CONNECT_TIMEOUT_MS = 15_000;

const REASONING_EFFORT_LABELS: Record<string, string> = {
  none: 'None',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra High',
  max: 'Max',
  ultra: 'Ultra',
};

interface CodexAccountResponse {
  account?: unknown;
  requiresOpenaiAuth?: boolean;
}

interface CodexCatalogModel {
  model?: string;
  displayName?: string;
  hidden?: boolean;
  isDefault?: boolean;
  supportedReasoningEfforts?: Array<{ reasoningEffort?: string }>;
}

interface CodexModelListResponse {
  data?: CodexCatalogModel[];
  nextCursor?: string | null;
}

interface CodexThreadResponse {
  thread?: { id?: string };
}

interface CodexTurnResponse {
  turn?: { id?: string };
}

interface CodexTurnCompletedTurn {
  id?: string;
  status?: string;
  error?: { message?: string } | null;
  items?: Array<{ type?: string; text?: string }>;
}

let server: CodexAppServer | null = null;
let connectPromise: Promise<CodexAppServer> | null = null;
let modelCache: ProviderModelOption[] = [];
let defaultModel: string | null = null;

async function getOrCreateServer(signal?: AbortSignal): Promise<CodexAppServer> {
  throwIfProviderAborted(signal);
  if (server) return server;

  if (!connectPromise) {
    connectPromise = connect()
      .then(connected => {
        server = connected;
        return connected;
      })
      .catch(error => {
        connectPromise = null;
        throw error;
      });
  }

  const connected = await connectPromise;
  throwIfProviderAborted(signal);
  return connected;
}

async function connect(): Promise<CodexAppServer> {
  const instance = CodexAppServer.spawn();
  instance.addCloseListener(() => {
    // Drop the cached connection so the next call spawns a fresh app-server.
    if (server !== instance) return;
    server = null;
    connectPromise = null;
  });
  try {
    await withRequestTimeout(
      instance.request('initialize', {
        clientInfo: CLIENT_INFO,
        capabilities: { experimentalApi: true },
      }),
      CONNECT_TIMEOUT_MS,
      'The Codex app-server did not respond to initialization in time.',
    );
    instance.notify('initialized');
    return instance;
  } catch (error) {
    await instance.dispose();
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function readAccount(instance: CodexAppServer, signal?: AbortSignal): Promise<void> {
  const response = (await withRequestTimeout(
    instance.request('account/read', {}, signal),
    CONNECT_TIMEOUT_MS,
    'The Codex app-server did not respond to the account check in time.',
  )) as CodexAccountResponse;
  if (!response.account && response.requiresOpenaiAuth) throw new Error(CODEX_LOGIN_REQUIRED_MESSAGE);
}

async function refreshModels(instance: CodexAppServer, signal?: AbortSignal): Promise<void> {
  const options: ProviderModelOption[] = [];
  let defaultSlug: string | null = null;
  let cursor: string | null = null;

  do {
    const response = (await withRequestTimeout(
      instance.request('model/list', cursor ? { cursor } : {}, signal),
      CONNECT_TIMEOUT_MS,
      'The Codex app-server did not respond to the model listing in time.',
    )) as CodexModelListResponse;

    for (const model of response.data ?? []) {
      if (!model.model || model.hidden === true) continue;
      if (model.isDefault === true && !defaultSlug) defaultSlug = model.model;
      options.push(toModelOption(model.model, model));
    }

    cursor = response.nextCursor ?? null;
  } while (cursor);

  modelCache = options;
  defaultModel = defaultSlug ?? options[0]?.model ?? null;
}

function toModelOption(slug: string, model: CodexCatalogModel): ProviderModelOption {
  const reasoningLevels = (model.supportedReasoningEfforts ?? [])
    .map(entry => entry.reasoningEffort)
    .filter((effort): effort is string => Boolean(effort))
    .map(effort => ({ id: effort, label: reasoningEffortLabel(effort), value: effort }));

  return {
    id: slug,
    label: toDisplayName(slug, model),
    model: slug,
    reasoningLevels,
  };
}

function toDisplayName(slug: string, model: CodexCatalogModel): string {
  const displayName = model.displayName?.trim() || slug;
  // Capitalize 'gpt' to 'GPT' and any letter following a dash.
  return displayName.replace(/^gpt/i, 'GPT').replace(/-([a-z])/g, (_, letter: string) => `-${letter.toUpperCase()}`);
}

function reasoningEffortLabel(effort: string): string {
  return REASONING_EFFORT_LABELS[effort] ?? effort;
}

export function withRequestTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function resolveModel(options: ProviderPromptOptions): string | null {
  return options.model?.trim() || defaultModel;
}

function resolveEffort(options: ProviderPromptOptions, model: string | null): string | undefined {
  const effort = options.reasoningEffort?.trim();
  if (!effort) return undefined;
  const levels = modelCache.find(option => option.model === model)?.reasoningLevels ?? [];
  return levels.some(level => level.value === effort) ? effort : undefined;
}

async function openThread(
  instance: CodexAppServer,
  options: ProviderPromptOptions,
  files: Array<{ path: string }>,
  signal?: AbortSignal,
): Promise<string> {
  const firstLocalFile = files.find(file => !isRemoteMaterial(file.path));
  const params = {
    cwd: options.workingDirectory ?? (firstLocalFile ? path.dirname(path.resolve(firstLocalFile.path)) : process.cwd()),
    approvalPolicy: APPROVAL_POLICY,
    sandbox: SANDBOX_MODE,
    personality: 'none',
    ...(options.system ? { developerInstructions: options.system } : {}),
  };

  if (options.threadId) {
    try {
      const resumed = (await instance.request(
        'thread/resume',
        { threadId: options.threadId, ...params },
        signal,
      )) as CodexThreadResponse;
      if (resumed.thread?.id) return resumed.thread.id;
    } catch {
      // Fall back to a fresh thread when the previous one cannot be restored.
    }
  }

  const started = (await instance.request('thread/start', params, signal)) as CodexThreadResponse;
  const threadId = started.thread?.id;
  if (!threadId) throw new Error('The Codex app-server did not return a study thread.');
  return threadId;
}

function readTextFromItems(items: CodexTurnCompletedTurn['items']): string {
  return (items ?? [])
    .filter(
      (item): item is { type: string; text: string } => item.type === 'agentMessage' && typeof item.text === 'string',
    )
    .map(item => item.text)
    .join('');
}

function runTurn(
  instance: CodexAppServer,
  threadId: string,
  text: string,
  options: ProviderPromptOptions,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let turnId: string | null = null;
    let turnStarted = false;
    const deltas: string[] = [];

    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      instance.removeNotificationListener(onNotification);
      instance.removeCloseListener(onClose);
      options.signal?.removeEventListener('abort', onAbort);
      settle();
    };

    const fail = (error: unknown) =>
      finish(() => reject(error instanceof Error ? error : new Error('The Codex turn failed unexpectedly.')));

    // Before turn/start resolves we cannot tell turns apart, so notifications
    // without a usable turn id are accepted; afterwards, foreign-turn traffic
    // (for example stragglers from an interrupted turn on a resumed thread)
    // must not leak into this waiter.
    function belongsToCurrentTurn(candidate: unknown): boolean {
      if (turnId === null) return true;
      return typeof candidate !== 'string' || candidate.length === 0 || candidate === turnId;
    }

    function onNotification(notification: CodexAppServerNotification): void {
      const params = notification.params as Record<string, unknown> | undefined;
      if (!params || params.threadId !== threadId) return;

      if (notification.method === 'item/agentMessage/delta') {
        if (typeof params.delta === 'string' && belongsToCurrentTurn(params.turnId)) deltas.push(params.delta);
        return;
      }

      if (notification.method === 'turn/completed') {
        const turn = params.turn as CodexTurnCompletedTurn | undefined;
        if (!belongsToCurrentTurn(turn?.id)) return;
        const errorMessage = turn?.error?.message?.trim();
        if (errorMessage) {
          fail(new Error(errorMessage));
          return;
        }
        const text = readTextFromItems(turn?.items) || deltas.join('');
        finish(() => {
          if (!text.trim()) {
            reject(new Error('The provider returned an empty response.'));
            return;
          }
          resolve(text.trim());
        });
        return;
      }

      if (notification.method === 'error') {
        if (params.willRetry === true || !belongsToCurrentTurn(params.turnId)) return;
        const message =
          typeof (params.error as { message?: unknown } | undefined)?.message === 'string'
            ? (params.error as { message: string }).message
            : 'The Codex turn failed.';
        fail(new Error(message));
      }
    }

    function onAbort(): void {
      const reason = options.signal?.reason;
      fail(createProviderAbortError(reason));
      if (turnId) void instance.request('turn/interrupt', { threadId, turnId }).catch(() => undefined);
    }

    function onClose(error: Error): void {
      fail(error);
    }

    instance.addNotificationListener(onNotification);
    instance.addCloseListener(onClose);
    options.signal?.addEventListener('abort', onAbort, { once: true });

    const model = resolveModel(options);
    const effort = resolveEffort(options, model);
    void instance
      .request(
        'turn/start',
        {
          threadId,
          input: [{ type: 'text', text }],
          approvalPolicy: APPROVAL_POLICY,
          sandboxPolicy: { type: 'readOnly' },
          ...(model ? { model } : {}),
          ...(effort ? { effort } : {}),
          ...(options.responseSchema ? { outputSchema: options.responseSchema } : {}),
        },
        options.signal,
      )
      .then(response => {
        turnId = ((response as CodexTurnResponse).turn?.id ?? null) as string | null;
        turnStarted = true;
        if (options.signal?.aborted) onAbort();
      })
      .catch(error => {
        if (!turnStarted && !settled) fail(error);
      });
  });
}

export class CodexProvider implements StudyProvider<'codex'> {
  readonly id = 'codex';
  readonly label = 'Codex';

  async checkAuth(signal?: AbortSignal): Promise<void> {
    try {
      const instance = await getOrCreateServer(signal);
      await readAccount(instance, signal);
      await refreshModels(instance, signal);
    } catch (error) {
      throw normalizeProviderError(error, { authMessage: CODEX_LOGIN_REQUIRED_MESSAGE, signal });
    }
  }

  getModels(): ProviderModelOption[] {
    return cloneModelOptions(modelCache);
  }

  async prompt(input: string, options: ProviderPromptOptions = {}): Promise<ProviderPromptResult> {
    throwIfProviderAborted(options.signal);

    const files = resolvePromptFiles(options);
    const prompt = buildMaterialPrompt(input, files);

    try {
      const instance = await getOrCreateServer(options.signal);
      await readAccount(instance, options.signal);
      const threadId = await openThread(instance, options, files, options.signal);
      const text = await runTurn(instance, threadId, prompt, options);
      return { text };
    } catch (error) {
      throw normalizeProviderError(error, {
        authMessage: CODEX_LOGIN_REQUIRED_MESSAGE,
        signal: options.signal,
      });
    }
  }

  async dispose(): Promise<void> {
    await disposeCodexProvider();
  }
}

export async function disposeCodexProvider(): Promise<void> {
  const instance = server;
  server = null;
  connectPromise = null;
  modelCache = [];
  defaultModel = null;
  if (instance) await instance.dispose();
}

function cloneModelOptions(options: ProviderModelOption[]): ProviderModelOption[] {
  return options.map(option => ({
    ...option,
    reasoningLevels: option.reasoningLevels.map(level => ({ ...level })),
    ...(option.group ? { group: { ...option.group } } : {}),
  }));
}
