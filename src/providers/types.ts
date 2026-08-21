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

/** @deprecated Provider construction is owned by providerRegistry. */
export type ProviderConstructor<TProvider extends AIProvider = AIProvider> = new () => TProvider;

/** @deprecated Use ProviderMetadata and providerRegistry for new code. */
export interface ProviderDefinition<TProvider extends AIProvider = AIProvider> extends ProviderMetadata<Provider> {
  Provider: ProviderConstructor<TProvider>;
}
