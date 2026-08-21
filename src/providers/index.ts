import type { Provider } from '../domain/provider.js';
import { CodexProvider, OpenCodeProvider, providerRegistry } from '../infrastructure/providers/index.js';
import type { AIProvider, ProviderDefinition } from './types.js';

export type { Provider, ProviderConfig } from '../domain/provider.js';
export {
  CODEX_LOGIN_REQUIRED_MESSAGE,
  CODEX_MODEL_OPTIONS,
  CODEX_MODELS,
  CONTEXT_OVERFLOW_MESSAGE,
  type CodexPromptOptions,
  CodexProvider,
  disposeCodexProvider as closeCodexProvider,
  disposeOpenCodeProvider as closeOpenCodeProvider,
  normalizeProviderError,
  OPENCODE_LOGIN_REQUIRED_MESSAGE,
  OPENCODE_MODEL_OPTIONS,
  OPENCODE_MODELS,
  OpenCodeProvider,
  PROVIDER_METADATA,
  ProviderRegistry,
  providerRegistry,
} from '../infrastructure/providers/index.js';
export type {
  AIProvider,
  ProviderDefinition,
  ProviderMetadata,
  ProviderModelOption,
  ProviderPromptFile,
  ProviderPromptOptions,
  ProviderPromptStreamEvent,
  ProviderReasoningLevel,
  ProviderRegistration,
  StudyProvider,
} from './types.js';

export function getAvailableProviders(): ProviderDefinition[] {
  return providerRegistry.listMetadata();
}

export function getProviderDefinition(id: string): ProviderDefinition | null {
  return providerRegistry.getMetadata(id);
}

export function createProvider(id: Provider): AIProvider;
export function createProvider(id: string): AIProvider | null;
export function createProvider(id: string): AIProvider | null {
  return providerRegistry.create(id);
}

export async function closeProviders(): Promise<void> {
  await providerRegistry.disposeAll();
}
