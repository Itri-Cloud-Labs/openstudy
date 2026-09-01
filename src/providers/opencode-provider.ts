import net from 'node:net';
import { createOpencodeClient, createOpencodeServer, type OpencodeClient } from '@opencode-ai/sdk/v2';
import type { ProviderListResponse } from '@opencode-ai/sdk/v2';
import type { ProviderModelOption, ProviderPromptOptions, ProviderPromptResult, StudyProvider } from './contracts.js';
import { createProviderAbortError, normalizeProviderError, throwIfProviderAborted } from './errors.js';
import { buildMaterialPrompt, resolvePromptFiles } from './material-prompt.js';

type OpenCodeServer = Awaited<ReturnType<typeof createOpencodeServer>>;

interface OpenCodeInstance {
  client: OpencodeClient;
  server: OpenCodeServer;
}

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

export const OPENCODE_LOGIN_REQUIRED_MESSAGE = [
  'Could not connect to the OpenCode server.',
  'Make sure the opencode CLI is installed and at least one provider is configured, then try again.',
].join(' ');

export const OPENCODE_NO_PROVIDERS_MESSAGE =
  'OpenCode is running, but no upstream providers are connected. Run `opencode auth login` to configure one, then try again.';

let instance: OpenCodeInstance | null = null;
let initPromise: Promise<OpenCodeInstance> | null = null;
let cachedModels: ProviderModelOption[] | null = null;

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close(() => reject(new Error('Could not find a free port for the OpenCode server.')));
        return;
      }
      const { port } = address;
      probe.close(() => resolve(port));
    });
  });
}

async function getOrCreateOpencode(signal?: AbortSignal): Promise<OpenCodeInstance> {
  throwIfProviderAborted(signal);
  if (instance) return instance;

  if (!initPromise) {
    initPromise = (async (): Promise<OpenCodeInstance> => {
      const port = await findFreePort();
      throwIfProviderAborted(signal);
      const server = await createOpencodeServer({ hostname: '127.0.0.1', port, config: OPENCODE_CONFIG });
      // throwOnError makes HTTP failures throw instead of returning an empty
      // payload, so provider and session errors surface with their real cause.
      const client = createOpencodeClient({ baseUrl: server.url, throwOnError: true });
      return { client, server };
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

export class OpenCodeProvider implements StudyProvider<'opencode'> {
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

    try {
      const result = await current.client.provider.list();
      throwIfProviderAborted(signal);
      if (!result.data) throw new Error(OPENCODE_LOGIN_REQUIRED_MESSAGE);

      const options = toModelOptions(result.data);
      if (options.length === 0) throw new Error(OPENCODE_NO_PROVIDERS_MESSAGE);
      cachedModels = options;
    } catch (error) {
      if (signal?.aborted) throw createProviderAbortError(signal.reason);
      if (
        error instanceof Error &&
        (error.message === OPENCODE_NO_PROVIDERS_MESSAGE || error.message === OPENCODE_LOGIN_REQUIRED_MESSAGE)
      ) {
        throw error;
      }
      throw new Error(OPENCODE_LOGIN_REQUIRED_MESSAGE, { cause: error });
    }
  }

  getModels(): ProviderModelOption[] {
    return cloneModelOptions(cachedModels ?? []);
  }

  async prompt(input: string, options: ProviderPromptOptions = {}): Promise<ProviderPromptResult> {
    throwIfProviderAborted(options.signal);

    let current: OpenCodeInstance;
    try {
      current = await getOrCreateOpencode(options.signal);
    } catch (error) {
      if (options.signal?.aborted) throw createProviderAbortError(options.signal.reason);
      throw new Error(OPENCODE_LOGIN_REQUIRED_MESSAGE, { cause: error });
    }
    const { client } = current;

    const modelString = options.model ?? '';
    const slashIndex = modelString.indexOf('/');
    const model =
      slashIndex >= 0
        ? { providerID: modelString.slice(0, slashIndex), modelID: modelString.slice(slashIndex + 1) }
        : undefined;
    const fullInput = buildMaterialPrompt(input, resolvePromptFiles(options));
    const variant = options.reasoningEffort?.trim();

    let sessionId: string | null = null;

    try {
      const sessionResult = await client.session.create({
        directory: options.workingDirectory ?? process.cwd(),
        title: 'OpenStudy',
      });
      throwIfProviderAborted(options.signal);
      if (!sessionResult.data) throw new Error('Failed to create OpenCode session');
      sessionId = sessionResult.data.id;

      // Structured prompts rely on the model's JSON instructions; OpenCode
      // suppresses text streaming when json_schema format is active.
      const result = await client.session.prompt({
        sessionID: sessionId,
        parts: [{ type: 'text', text: fullInput }],
        ...(model ? { model } : {}),
        ...(variant ? { variant } : {}),
        agent: 'study',
        ...(options.system ? { system: options.system } : {}),
      });
      throwIfProviderAborted(options.signal);

      if (result.data?.info.error) {
        throw normalizeProviderError(result.data.info.error, {
          fallbackMessage: 'An error occurred during the session.',
          signal: options.signal,
        });
      }

      const text = (result.data?.parts ?? [])
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('')
        .trim();
      if (!text) throw new Error('The provider returned an empty response.');
      return { text };
    } catch (error) {
      throw normalizeProviderError(error, {
        fallbackMessage: 'An error occurred during the session.',
        signal: options.signal,
      });
    } finally {
      if (options.signal?.aborted && sessionId) {
        await client.session.abort({ sessionID: sessionId }).catch(() => null);
      }
      if (sessionId) {
        await client.session.delete({ sessionID: sessionId }).catch(() => null);
      }
    }
  }

  async dispose(): Promise<void> {
    await disposeOpenCodeProvider();
  }
}

export function toModelOptions(data: ProviderListResponse): ProviderModelOption[] {
  const connected = new Set(data.connected ?? []);
  const options: ProviderModelOption[] = [];

  for (const provider of data.all) {
    if (!connected.has(provider.id)) continue;

    for (const [modelId, model] of Object.entries(provider.models ?? {})) {
      const id = `${provider.id}/${modelId}`;
      options.push({
        id,
        label: `${model.name || modelId} (${provider.name || provider.id})`,
        model: id,
        reasoningLevels: Object.keys(model.variants ?? {}).map(variant => ({
          id: variant,
          label: reasoningVariantLabel(variant),
          value: variant,
        })),
        group: { id: provider.id, name: provider.name || provider.id },
      });
    }
  }

  return options.sort((left, right) => left.label.localeCompare(right.label));
}

function reasoningVariantLabel(variant: string): string {
  const labels: Record<string, string> = {
    none: 'None',
    minimal: 'Minimal',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    xhigh: 'Extra High',
    max: 'Max',
    ultra: 'Ultra',
  };

  return (
    labels[variant.toLowerCase()] ?? variant.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
  );
}

export async function disposeOpenCodeProvider(): Promise<void> {
  if (!instance) return;

  instance.server.close();
  instance = null;
  initPromise = null;
  cachedModels = null;
}

function cloneModelOptions(options: ProviderModelOption[]): ProviderModelOption[] {
  return options.map(option => ({
    ...option,
    reasoningLevels: option.reasoningLevels.map(level => ({ ...level })),
    ...(option.group ? { group: { ...option.group } } : {}),
  }));
}
