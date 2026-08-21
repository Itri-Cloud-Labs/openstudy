import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { jsonSchema, Output, streamText } from 'ai';
import { createCodexAppServer } from 'ai-sdk-provider-codex-cli';
import type {
  LegacyCompatibleStudyProvider,
  ProviderModelOption,
  ProviderPromptOptions,
  ProviderPromptStreamEvent,
  ProviderReasoningLevel,
} from './contracts.js';
import { normalizeProviderError, throwIfProviderAborted } from './errors.js';
import { buildMaterialPrompt, isRemoteMaterial, resolvePromptFiles } from './material-prompt.js';

const require = createRequire(import.meta.url);
const CODEX_CLI_PATH = (() => {
  try {
    return path.join(path.dirname(require.resolve('@openai/codex/package.json')), 'bin', 'codex.js');
  } catch {
    return null;
  }
})();

const DEFAULT_MODEL = 'gpt-5.3-codex';
const DEFAULT_APPROVAL_POLICY = 'never';
const DEFAULT_REASONING_LEVELS = [
  { id: 'minimal', label: 'Minimal', value: 'minimal' },
  { id: 'low', label: 'Low', value: 'low' },
  { id: 'medium', label: 'Medium', value: 'medium' },
  { id: 'high', label: 'High', value: 'high' },
] as const satisfies readonly ProviderReasoningLevel[];

export const CODEX_MODEL_OPTIONS: ProviderModelOption[] = [
  {
    id: 'gpt-5.3-codex',
    label: 'gpt-5.3-codex',
    model: 'gpt-5.3-codex',
    reasoningLevels: DEFAULT_REASONING_LEVELS.map(level => ({ ...level })),
  },
  {
    id: 'gpt-5.2-codex',
    label: 'gpt-5.2-codex',
    model: 'gpt-5.2-codex',
    reasoningLevels: DEFAULT_REASONING_LEVELS.map(level => ({ ...level })),
  },
  {
    id: 'gpt-5.2-codex-max',
    label: 'gpt-5.2-codex-max',
    model: 'gpt-5.2-codex-max',
    reasoningLevels: [...DEFAULT_REASONING_LEVELS, { id: 'xhigh', label: 'xHigh', value: 'xhigh' }],
  },
  {
    id: 'gpt-5.2-codex-mini',
    label: 'gpt-5.2-codex-mini',
    model: 'gpt-5.2-codex-mini',
    reasoningLevels: DEFAULT_REASONING_LEVELS.map(level => ({ ...level })),
  },
  {
    id: 'gpt-5.2',
    label: 'gpt-5.2',
    model: 'gpt-5.2',
    reasoningLevels: DEFAULT_REASONING_LEVELS.map(level => ({ ...level })),
  },
  {
    id: 'gpt-5.5',
    label: 'gpt-5.5',
    model: 'gpt-5.5',
    reasoningLevels: [...DEFAULT_REASONING_LEVELS, { id: 'xhigh', label: 'xHigh', value: 'xhigh' }],
  },
  {
    id: 'gpt-5.4',
    label: 'gpt-5.4',
    model: 'gpt-5.4',
    reasoningLevels: DEFAULT_REASONING_LEVELS.map(level => ({ ...level })),
  },
];

export const CODEX_MODELS = CODEX_MODEL_OPTIONS.map(option => option.model);

export const CODEX_LOGIN_REQUIRED_MESSAGE = [
  'Codex is not logged in on this machine.',
  'Please run `codex login` in a terminal window, or set `OPENAI_API_KEY`, then come back.',
].join(' ');

const codexAppServer = createCodexAppServer({
  defaultSettings: {
    // Avoid app-server approval events for study requests until the upstream
    // provider fixes malformed tool approval metadata.
    approvalPolicy: DEFAULT_APPROVAL_POLICY,
    autoApprove: true,
    sandboxPolicy: 'read-only',
    personality: 'none',
    logger: false,
    minCodexVersion: '0.105.0',
  },
});

export interface CodexPromptOptions extends ProviderPromptOptions {
  approvalPolicy?: 'untrusted' | 'on-failure' | 'on-request' | 'never';
  sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
}

export class CodexProvider implements LegacyCompatibleStudyProvider<'codex'> {
  readonly id = 'codex';
  readonly label = 'Codex';

  async checkAuth(signal?: AbortSignal): Promise<void> {
    throwIfProviderAborted(signal);
    if (process.env.OPENAI_API_KEY?.trim()) return;

    let result: { exitCode: number | null; output: string };
    try {
      result = await new Promise((resolve, reject) => {
        const spawnOptions = {
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
          signal,
        };
        const child = CODEX_CLI_PATH
          ? spawn(process.execPath, [CODEX_CLI_PATH, 'login', 'status'], spawnOptions)
          : spawn('codex', ['login', 'status'], spawnOptions);

        let output = '';
        child.stdout.on('data', chunk => {
          output += String(chunk);
        });
        child.stderr.on('data', chunk => {
          output += String(chunk);
        });
        child.on('error', reject);
        child.on('close', exitCode => {
          resolve({ exitCode, output });
        });
      });
    } catch (error) {
      throw normalizeProviderError(error, { signal });
    }

    throwIfProviderAborted(signal);
    if (result.exitCode !== 0) throw new Error(CODEX_LOGIN_REQUIRED_MESSAGE);
  }

  async listModels(signal?: AbortSignal): Promise<ProviderModelOption[]> {
    throwIfProviderAborted(signal);
    return cloneModelOptions(CODEX_MODEL_OPTIONS);
  }

  async *streamPrompt(input: string, options: CodexPromptOptions = {}): AsyncGenerator<ProviderPromptStreamEvent> {
    yield { type: 'status', text: 'Checking login' };
    await this.checkAuth(options.signal);

    const files = resolvePromptFiles(options);
    const firstLocalFile = files.find(file => !isRemoteMaterial(file.path));
    const workingDirectory =
      options.workingDirectory ?? (firstLocalFile ? path.dirname(path.resolve(firstLocalFile.path)) : process.cwd());
    const reasoningEffort = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'].includes(
      options.reasoningEffort ?? '',
    )
      ? (options.reasoningEffort as 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh')
      : undefined;
    const providerOptions =
      options.threadId || options.system
        ? {
            'codex-app-server': {
              ...(options.threadId ? { threadId: options.threadId } : {}),
              ...(options.system ? { developerInstructions: options.system } : {}),
            },
          }
        : undefined;
    const prompt = buildMaterialPrompt(input, files);

    if (options.responseSchema) {
      yield { type: 'status', text: 'Starting session' };

      const result = streamText({
        model: codexAppServer(options.model ?? DEFAULT_MODEL, {
          cwd: workingDirectory,
          approvalPolicy: options.approvalPolicy ?? DEFAULT_APPROVAL_POLICY,
          sandboxPolicy: options.sandboxMode ?? 'read-only',
          effort: reasoningEffort,
        }),
        prompt,
        abortSignal: options.signal,
        output: Output.object({ schema: jsonSchema(options.responseSchema) }),
        providerOptions,
      });

      let hasResponse = false;
      let responseText = '';
      yield { type: 'status', text: 'Waiting for structured response' };

      for await (const part of result.fullStream) {
        if (part.type === 'error') {
          throw normalizeProviderError(part.error, {
            authMessage: CODEX_LOGIN_REQUIRED_MESSAGE,
            signal: options.signal,
          });
        }

        if (!hasResponse && (part.type === 'reasoning-start' || part.type === 'reasoning-delta')) {
          yield { type: 'status', text: 'Analyzing key ideas' };
          continue;
        }

        if (part.type === 'text-delta') {
          hasResponse = true;
          responseText += part.text;
          yield { type: 'response', text: responseText };
        }
      }

      return;
    }

    yield { type: 'status', text: 'Starting session' };

    const result = streamText({
      model: codexAppServer(options.model ?? DEFAULT_MODEL, {
        cwd: workingDirectory,
        approvalPolicy: options.approvalPolicy ?? DEFAULT_APPROVAL_POLICY,
        sandboxPolicy: options.sandboxMode ?? 'read-only',
        effort: reasoningEffort,
      }),
      prompt,
      abortSignal: options.signal,
      providerOptions,
    });

    let hasResponse = false;
    let responseText = '';
    yield { type: 'status', text: 'Waiting for response' };

    for await (const part of result.fullStream) {
      if (part.type === 'error') {
        throw normalizeProviderError(part.error, {
          authMessage: CODEX_LOGIN_REQUIRED_MESSAGE,
          signal: options.signal,
        });
      }

      if (!hasResponse && (part.type === 'reasoning-start' || part.type === 'reasoning-delta')) {
        yield { type: 'status', text: 'Analyzing key ideas' };
        continue;
      }

      if (part.type === 'text-delta') {
        hasResponse = true;
        responseText += part.text;
        yield { type: 'response', text: responseText };
      }
    }
  }

  async dispose(): Promise<void> {
    await disposeCodexProvider();
  }

  async CheckLoginStatus(): Promise<boolean> {
    await this.checkAuth();
    return true;
  }

  GetModels(): ProviderModelOption[] {
    return cloneModelOptions(CODEX_MODEL_OPTIONS);
  }

  async *Prompt(input: string, options: CodexPromptOptions = {}): AsyncGenerator<ProviderPromptStreamEvent> {
    yield* this.streamPrompt(input, options);
  }
}

export async function disposeCodexProvider(): Promise<void> {
  await codexAppServer.close();
}

function cloneModelOptions(options: ProviderModelOption[]): ProviderModelOption[] {
  return options.map(option => ({
    ...option,
    reasoningLevels: option.reasoningLevels.map(level => ({ ...level })),
    ...(option.group ? { group: { ...option.group } } : {}),
  }));
}
