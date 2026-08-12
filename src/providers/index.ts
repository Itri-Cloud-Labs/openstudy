export { CodexProvider, CODEX_LOGIN_REQUIRED_MESSAGE, CODEX_MODEL_OPTIONS, CODEX_MODELS, closeCodexProvider, type CodexPromptOptions } from './codex.js';
export { OpenCodeProvider, OPENCODE_LOGIN_REQUIRED_MESSAGE, OPENCODE_MODEL_OPTIONS, OPENCODE_MODELS, closeOpenCodeProvider } from './opencode.js';
export type { AIProvider, ProviderConstructor, ProviderDefinition, ProviderModelOption, ProviderPromptOptions, ProviderReasoningLevel } from './types.js';

import { closeCodexProvider, CodexProvider } from './codex.js';
import { closeOpenCodeProvider, OpenCodeProvider } from './opencode.js';
import { PROVIDERS, type Provider } from '../types/index.js';
import type { AIProvider, ProviderDefinition } from './types.js';

const providerClasses = {
  codex: CodexProvider,
  opencode: OpenCodeProvider,
} as const satisfies Record<Provider, ProviderDefinition['Provider']>;

const providerDefinitions = PROVIDERS.map(provider => ({
  ...provider,
  Provider: providerClasses[provider.id],
})) satisfies ProviderDefinition[];

export function getAvailableProviders(): ProviderDefinition[] {
  return providerDefinitions.map(provider => ({ ...provider }));
}

export function getProviderDefinition(id: string): ProviderDefinition | null {
  return providerDefinitions.find(provider => provider.id === id) ?? null;
}

export function createProvider(id: Provider): AIProvider;
export function createProvider(id: string): AIProvider | null;
export function createProvider(id: string): AIProvider | null {
  const definition = getProviderDefinition(id);
  return definition ? new definition.Provider() : null;
}

export async function closeProviders() {
  await closeCodexProvider();
  await closeOpenCodeProvider();
}
