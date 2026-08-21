import type { Provider } from '../../domain/provider.js';
import {
  createProvider,
  PROVIDER_METADATA,
  type ProviderMetadata,
  type ProviderModelOption,
} from '../../providers/index.js';

export const MODEL_MODAL_MAX_ROWS = 6;
export const SPINNER_FRAMES = ['|', '/', '-', '\\'];

export type ModelProviderDefinition = ProviderMetadata & { id: Provider };
export type ProviderAuthStatus = { state: 'checking' } | { state: 'ready' } | { state: 'blocked'; message: string };
export type ProviderAuthById = Partial<Record<Provider, ProviderAuthStatus>>;

export interface ModelsProvidersState {
  id: 'models';
  layer: 'providers';
  selected: number;
  auth: ProviderAuthById;
  authCheckId: string;
  spinnerFrame: number;
  error?: string;
}

export interface ModelsSubProvidersState {
  id: 'models';
  layer: 'subproviders';
  provider: Provider;
  selected: number;
  auth: ProviderAuthById;
  authCheckId: string;
  spinnerFrame: number;
  error?: string;
}

export interface ModelsListState {
  id: 'models';
  layer: 'models';
  provider: Provider;
  subProvider: string | null;
  selected: number;
  auth: ProviderAuthById;
  authCheckId: string;
  spinnerFrame: number;
  error?: string;
}

export interface ModelsSetupState {
  id: 'models';
  layer: 'setup';
  provider: Provider;
  apiKey: string;
  auth: ProviderAuthById;
  authCheckId: string;
  spinnerFrame: number;
  error?: string;
}

export type ModelsModalState = ModelsProvidersState | ModelsSubProvidersState | ModelsListState | ModelsSetupState;

export function getModelProviders(): ModelProviderDefinition[] {
  return PROVIDER_METADATA.map(metadata => ({ ...metadata }));
}

export function getProviderModelOptions(provider: Provider, subProvider?: string | null): ProviderModelOption[] {
  const instance = createProvider(provider);
  if (!instance) return [];
  const models = instance.getModels();
  if (!subProvider) return models;
  return models.filter(m => m.group?.id === subProvider);
}

export function getSubProviders(models: ProviderModelOption[]): { id: string; name: string }[] {
  const seen = new Set<string>();
  const result: { id: string; name: string }[] = [];
  for (const model of models) {
    if (model.group && !seen.has(model.group.id)) {
      seen.add(model.group.id);
      result.push(model.group);
    }
  }
  return result;
}

export function getProviderLabel(provider: Provider): string {
  return getModelProviders().find(item => item.id === provider)?.label ?? provider;
}

export function getDefaultReasoningLevel(modelOption: ProviderModelOption) {
  return modelOption.reasoningLevels.find(level => level.value === 'medium') ?? modelOption.reasoningLevels[0] ?? null;
}
