import type { Provider } from '../domain/provider.js';
import type { LegacyCompatibleStudyProvider, ProviderMetadata } from '../infrastructure/providers/contracts.js';

export type { Provider, ProviderConfig } from '../domain/provider.js';
export type {
  ProviderMetadata,
  ProviderModelOption,
  ProviderPromptFile,
  ProviderPromptOptions,
  ProviderPromptStreamEvent,
  ProviderReasoningLevel,
  ProviderRegistration,
  StudyProvider,
} from '../infrastructure/providers/contracts.js';

/** @deprecated Depend on StudyProvider for new code. */
export type AIProvider = LegacyCompatibleStudyProvider<Provider>;

/** @deprecated Use ProviderMetadata and providerRegistry for new code. */
export type ProviderDefinition<TProviderId extends Provider = Provider> = ProviderMetadata<TProviderId>;
