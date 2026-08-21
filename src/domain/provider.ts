export type Provider = 'codex' | 'opencode';

/**
 * Authentication/configuration owned by the application, never by a saved
 * study session. Keeping this separate prevents credentials from being copied
 * into every session document.
 */
export interface ProviderConfig {
  provider: Provider | null;
  apiKey: string;
}

export function isProvider(value: unknown): value is Provider {
  return value === 'codex' || value === 'opencode';
}
