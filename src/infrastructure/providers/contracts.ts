import type { Provider } from '../../domain/provider.js';

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

export interface ProviderPromptStreamEvent {
  type: 'status' | 'response';
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
 * Runtime-facing provider contract. Provider discovery is asynchronous because
 * some backends can only enumerate models after connecting to a local service.
 */
export interface StudyProvider<TProviderId extends string = Provider> {
  readonly id: TProviderId;
  readonly label: string;
  checkAuth(signal?: AbortSignal): Promise<void>;
  listModels(signal?: AbortSignal): Promise<ProviderModelOption[]>;
  streamPrompt(input: string, options?: ProviderPromptOptions): AsyncGenerator<ProviderPromptStreamEvent>;
  dispose(): Promise<void>;
}

/**
 * Temporary source-compatibility surface for existing callers. New code should
 * depend on StudyProvider and its camelCase asynchronous methods.
 */
export interface LegacyCompatibleStudyProvider<TProviderId extends string = Provider>
  extends StudyProvider<TProviderId> {
  /** @deprecated Use listModels instead. */
  GetModels(): ProviderModelOption[];
}

export interface ProviderRegistration<
  TProviderId extends string,
  TProvider extends StudyProvider<TProviderId> = StudyProvider<TProviderId>,
> {
  metadata: ProviderMetadata<TProviderId>;
  create: () => TProvider;
  dispose: () => Promise<void>;
}
