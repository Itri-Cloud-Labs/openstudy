import type { Provider } from '../domain/provider.js';

export type ProviderPromptFile =
  | string
  | {
      path: string;
    };

export interface ProviderPromptOptions {
  system?: string;
  model?: string;
  threadId?: string;
  workingDirectory?: string;
  signal?: AbortSignal;
  reasoningEffort?: string;
  file?: ProviderPromptFile;
  files?: ProviderPromptFile[];
  responseSchema?: unknown;
}

export interface ProviderPromptResult {
  text: string;
}

export interface ProviderReasoningLevel {
  id: string;
  label: string;
  value: string;
}

export interface ProviderModelOption {
  id: string;
  label: string;
  model: string;
  reasoningLevels: ProviderReasoningLevel[];
  group?: { id: string; name: string };
}

export interface ProviderMetadata<TProviderId extends string = Provider> {
  id: TProviderId;
  label: string;
  requiresKey: boolean;
}

/**
 * Runtime-facing provider contract. getModels returns locally known or cached
 * models without contacting the backend; checkAuth connects and validates
 * credentials before prompting.
 */
export interface StudyProvider<TProviderId extends string = Provider> {
  readonly id: TProviderId;
  readonly label: string;
  checkAuth(signal?: AbortSignal): Promise<void>;
  getModels(): ProviderModelOption[];
  prompt(input: string, options?: ProviderPromptOptions): Promise<ProviderPromptResult>;
  dispose(): Promise<void>;
}
