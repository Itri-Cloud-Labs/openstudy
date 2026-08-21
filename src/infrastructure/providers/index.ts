import type { Provider } from '../../domain/provider.js';
import { CodexProvider, disposeCodexProvider } from './codex-provider.js';
import type { LegacyCompatibleStudyProvider } from './contracts.js';
import { PROVIDER_METADATA } from './metadata.js';
import { disposeOpenCodeProvider, OpenCodeProvider } from './opencode-provider.js';
import { ProviderRegistry } from './registry.js';

export {
  CODEX_LOGIN_REQUIRED_MESSAGE,
  CODEX_MODEL_OPTIONS,
  CODEX_MODELS,
  type CodexPromptOptions,
  CodexProvider,
  disposeCodexProvider,
} from './codex-provider.js';
export type {
  LegacyCompatibleStudyProvider,
  ProviderMetadata,
  ProviderModelOption,
  ProviderPromptFile,
  ProviderPromptOptions,
  ProviderPromptStreamEvent,
  ProviderReasoningLevel,
  ProviderRegistration,
  StudyProvider,
} from './contracts.js';
export {
  CONTEXT_OVERFLOW_MESSAGE,
  createProviderAbortError,
  getProviderErrorMessage,
  normalizeProviderError,
  throwIfProviderAborted,
} from './errors.js';
export { PROVIDER_METADATA } from './metadata.js';
export {
  disposeOpenCodeProvider,
  OPENCODE_LOGIN_REQUIRED_MESSAGE,
  OPENCODE_MODEL_OPTIONS,
  OPENCODE_MODELS,
  OpenCodeProvider,
} from './opencode-provider.js';
export { ProviderRegistry } from './registry.js';

export const providerRegistry = new ProviderRegistry<Provider, LegacyCompatibleStudyProvider<Provider>>([
  {
    metadata: PROVIDER_METADATA[0],
    create: () => new CodexProvider(),
    dispose: disposeCodexProvider,
  },
  {
    metadata: PROVIDER_METADATA[1],
    create: () => new OpenCodeProvider(),
    dispose: disposeOpenCodeProvider,
  },
]);
