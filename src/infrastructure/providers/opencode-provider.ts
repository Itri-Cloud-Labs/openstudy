import { createOpencode } from '@opencode-ai/sdk/v2';
import type {
  LegacyCompatibleStudyProvider,
  ProviderModelOption,
  ProviderPromptOptions,
  ProviderPromptStreamEvent,
} from './contracts.js';
import { createProviderAbortError, normalizeProviderError, throwIfProviderAborted } from './errors.js';
import { buildMaterialPrompt, resolvePromptFiles } from './material-prompt.js';

type OpenCodeInstance = Awaited<ReturnType<typeof createOpencode>>;

const OPENCODE_PORTS = [5678, 8754];

const OPENCODE_CONFIG = {
  compaction: { auto: false },
  agent: {
    compaction: { disable: true },
    // Custom toolless agent used for all OpenStudy prompts.
    // "permission: deny" means no tools are registered, so the model
    // gets a minimal system prompt without any tool definitions.
    study: {
      mode: 'primary' as const,
      description: 'Tool-free study assistant for OpenStudy',
    },
  },
};

let instance: OpenCodeInstance | null = null;
let initPromise: Promise<OpenCodeInstance> | null = null;
let cachedModels: ProviderModelOption[] | null = null;

async function getOrCreateOpencode(signal?: AbortSignal): Promise<OpenCodeInstance> {
  throwIfProviderAborted(signal);
  if (instance) return instance;

  if (!initPromise) {
    initPromise = (async (): Promise<OpenCodeInstance> => {
      let lastError: unknown;

      for (const port of OPENCODE_PORTS) {
        throwIfProviderAborted(signal);
        try {
          return await createOpencode({ port, config: OPENCODE_CONFIG });
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError;
    })()
      .then(created => {
        instance = created;
        return created;
      })
      .catch(error => {
        initPromise = null;
        throw error;
      });
  }

  const created = await initPromise;
  throwIfProviderAborted(signal);
  return created;
}

export const OPENCODE_LOGIN_REQUIRED_MESSAGE = [
  'Could not connect to the OpenCode server.',
  'Make sure the opencode CLI is installed and at least one provider is configured, then try again.',
].join(' ');

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5';

// Retained for source compatibility. OpenCode models are discovered at runtime.
export const OPENCODE_MODEL_OPTIONS: ProviderModelOption[] = [];
export const OPENCODE_MODELS: string[] = [];

export class OpenCodeProvider implements LegacyCompatibleStudyProvider<'opencode'> {
  readonly id = 'opencode';
  readonly label = 'OpenCode';

  async checkAuth(signal?: AbortSignal): Promise<void> {
    let current: OpenCodeInstance;
    try {
      current = await getOrCreateOpencode(signal);
    } catch (error) {
      if (signal?.aborted) throw createProviderAbortError(signal.reason);
      throw new Error(OPENCODE_LOGIN_REQUIRED_MESSAGE, { cause: error });
    }

    throwIfProviderAborted(signal);
    const health = await current.client.global.health();
    throwIfProviderAborted(signal);
    if (!health.data?.healthy) throw new Error(OPENCODE_LOGIN_REQUIRED_MESSAGE);
  }

  async listModels(signal?: AbortSignal): Promise<ProviderModelOption[]> {
    await this.checkAuth(signal);
    const current = await getOrCreateOpencode(signal);

    try {
      const result = await current.client.provider.list();
      throwIfProviderAborted(signal);
      if (!result.data) return cloneModelOptions(cachedModels ?? []);

      const { all, connected } = result.data;
      const options: ProviderModelOption[] = [];

      for (const provider of all) {
        if (!connected.includes(provider.id)) continue;

        for (const [modelId, model] of Object.entries(provider.models)) {
          const id = `${provider.id}/${modelId}`;
          options.push({
            id,
            label: `${model.name} (${provider.name})`,
            model: id,
            reasoningLevels: [],
            group: { id: provider.id, name: provider.name },
          });
        }
      }

      if (options.length > 0) cachedModels = options;
    } catch {
      if (signal?.aborted) throw createProviderAbortError(signal.reason);
      // Model discovery was non-fatal in the legacy provider. Keep any last
      // successful result and allow the auth check to remain usable.
    }

    return cloneModelOptions(cachedModels ?? []);
  }

  async *streamPrompt(input: string, options: ProviderPromptOptions = {}): AsyncGenerator<ProviderPromptStreamEvent> {
    yield { type: 'status', text: 'Checking login' };
    throwIfProviderAborted(options.signal);

    let current: OpenCodeInstance;
    try {
      current = await getOrCreateOpencode(options.signal);
    } catch (error) {
      if (options.signal?.aborted) throw createProviderAbortError(options.signal.reason);
      throw new Error(OPENCODE_LOGIN_REQUIRED_MESSAGE, { cause: error });
    }
    const { client } = current;

    const modelString = options.model ?? DEFAULT_MODEL;
    const slashIndex = modelString.indexOf('/');
    const providerId = slashIndex >= 0 ? modelString.slice(0, slashIndex) : 'anthropic';
    const modelId = slashIndex >= 0 ? modelString.slice(slashIndex + 1) : modelString;
    const fullInput = buildMaterialPrompt(input, resolvePromptFiles(options));

    yield { type: 'status', text: 'Starting session' };

    let sessionId: string | null = null;
    let eventSubscription: Awaited<ReturnType<typeof client.event.subscribe>> | null = null;
    let promptPromise: ReturnType<typeof client.session.prompt> | null = null;

    const structured = Boolean(options.responseSchema);
    let hasResponse = false;
    let responseText = '';

    try {
      const sessionResult = await client.session.create({
        directory: options.workingDirectory ?? process.cwd(),
        title: 'OpenStudy',
      });
      throwIfProviderAborted(options.signal);
      if (!sessionResult.data) throw new Error('Failed to create OpenCode session');
      sessionId = sessionResult.data.id;

      eventSubscription = await client.event.subscribe();
      throwIfProviderAborted(options.signal);

      // OpenCode suppresses text-delta streaming when json_schema format is
      // active, so structured prompts rely on the model's JSON instructions.
      promptPromise = client.session.prompt({
        sessionID: sessionId,
        parts: [{ type: 'text', text: fullInput }],
        model: { providerID: providerId, modelID: modelId },
        agent: 'study',
        ...(options.system ? { system: options.system } : {}),
      });

      yield { type: 'status', text: structured ? 'Waiting for structured response' : 'Waiting for response' };

      for await (const event of eventSubscription.stream) {
        throwIfProviderAborted(options.signal);

        if (event.type === 'session.next.text.delta') {
          if (event.properties.sessionID !== sessionId) continue;
          hasResponse = true;
          responseText += event.properties.delta;
          yield { type: 'response', text: responseText };
        } else if (event.type === 'session.next.reasoning.started') {
          if (event.properties.sessionID !== sessionId) continue;
          if (!hasResponse) yield { type: 'status', text: 'Analyzing key ideas' };
        } else if (event.type === 'session.error') {
          if (event.properties.sessionID !== sessionId) continue;
          throw normalizeProviderError(event.properties.error, {
            fallbackMessage: 'An error occurred during the session.',
            signal: options.signal,
          });
        } else if (event.type === 'message.updated') {
          if (event.properties.sessionID !== sessionId) continue;
          const message = event.properties.info;
          if (message.role === 'assistant' && message.error) {
            throw normalizeProviderError(message.error, {
              fallbackMessage: 'An error occurred during the session.',
              signal: options.signal,
            });
          }
        } else if (event.type === 'session.idle' && event.properties.sessionID === sessionId) {
          break;
        }
      }

      await promptPromise.catch(() => null);

      if (structured && responseText) {
        yield { type: 'response', text: responseText };
      }
    } catch (error) {
      throw normalizeProviderError(error, {
        fallbackMessage: 'An error occurred during the session.',
        signal: options.signal,
      });
    } finally {
      if (options.signal?.aborted && sessionId) {
        await client.session.abort({ sessionID: sessionId }).catch(() => null);
      }
      if (promptPromise) {
        await promptPromise.catch(() => null);
      }
      if (eventSubscription) {
        await eventSubscription.stream.return(undefined).catch(() => undefined);
      }
      if (sessionId) {
        await client.session.delete({ sessionID: sessionId }).catch(() => null);
      }
    }
  }

  async dispose(): Promise<void> {
    await disposeOpenCodeProvider();
  }

  async CheckLoginStatus(): Promise<boolean> {
    await this.listModels();
    return true;
  }

  GetModels(): ProviderModelOption[] {
    return cloneModelOptions(cachedModels ?? []);
  }

  async *Prompt(input: string, options: ProviderPromptOptions = {}): AsyncGenerator<ProviderPromptStreamEvent> {
    yield* this.streamPrompt(input, options);
  }
}

export async function disposeOpenCodeProvider(): Promise<void> {
  if (!instance) return;

  instance.server.close();
  instance = null;
  initPromise = null;
}

function cloneModelOptions(options: ProviderModelOption[]): ProviderModelOption[] {
  return options.map(option => ({
    ...option,
    reasoningLevels: option.reasoningLevels.map(level => ({ ...level })),
    ...(option.group ? { group: { ...option.group } } : {}),
  }));
}
