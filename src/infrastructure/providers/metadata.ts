import type { Provider } from '../../domain/provider.js';
import type { ProviderMetadata } from './contracts.js';

/**
 * Provider metadata lives in a side-effect-free leaf module so configuration
 * and UI code can read it without initializing provider SDK runtimes.
 */
export const PROVIDER_METADATA = [
  { id: 'codex', label: 'Codex', requiresKey: false },
  { id: 'opencode', label: 'OpenCode', requiresKey: false },
] as const satisfies readonly ProviderMetadata<Provider>[];
