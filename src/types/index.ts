import type { Provider, ProviderConfig } from '../domain/provider.js';
import { PROVIDER_METADATA } from '../providers/index.js';

export type { Provider, ProviderConfig } from '../domain/provider.js';
export type { SessionSettings } from '../domain/study.js';
export type { ProviderMetadata as ProviderMeta } from '../providers/contracts.js';

export interface Config extends ProviderConfig {
  provider: Provider;
}

/** Compatibility name used by existing selectors. Metadata is owned by the provider registry. */
export const PROVIDERS = PROVIDER_METADATA;
