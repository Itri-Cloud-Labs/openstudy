import { isProvider, type Provider } from '../domain/provider.js';
import { CodexProvider, disposeCodexProvider } from './codex-provider.js';
import type { StudyProvider } from './contracts.js';
import { disposeOpenCodeProvider, OpenCodeProvider } from './opencode-provider.js';

export { PROVIDER_METADATA } from './metadata.js';
export type {
  ProviderMetadata,
  ProviderModelOption,
  ProviderPromptFile,
  ProviderPromptOptions,
  ProviderPromptResult,
  ProviderReasoningLevel,
  StudyProvider,
} from './contracts.js';

const factories = {
  codex: () => new CodexProvider(),
  opencode: () => new OpenCodeProvider(),
} as const satisfies Record<Provider, () => StudyProvider>;

export function createProvider(id: Provider): StudyProvider;
export function createProvider(id: string): StudyProvider | null;
export function createProvider(id: string): StudyProvider | null {
  return isProvider(id) ? factories[id]() : null;
}

export async function closeProviders(): Promise<void> {
  await Promise.all([disposeCodexProvider(), disposeOpenCodeProvider()]);
}
