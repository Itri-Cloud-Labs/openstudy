import type { Provider } from '../../domain/provider.js';
import { createHandleInput, isBackspace, isCancel, isPlainTextInput, isSubmit } from '../input.js';
import type { ModalContext, ModalInputKey, ModalInputProps, ModalRenderContext, ModalRenderProps } from '../types.js';
import { createCheckingAuth, getAuthStatus, isProviderUsable, startProviderAuthCheck } from './auth.js';
import { ModelsLayer } from './models-layer.js';
import { ProviderLayer } from './providers-layer.js';
import { SetupLayer } from './setup-layer.js';
import { SubProvidersLayer } from './subproviders-layer.js';
import {
  getDefaultReasoningLevel,
  getModelProviders,
  getProviderModelOptions,
  getSubProviders,
  MODEL_MODAL_MAX_ROWS,
  type ModelsListState,
  type ModelsModalState,
  type ModelsSetupState,
  type ModelsSubProvidersState,
  type ModelsProvidersState,
} from './state.js';

export function open(context: ModalContext): ModelsModalState {
  const providers = getModelProviders();
  const auth = createCheckingAuth(providers);
  const authCheckId = `${Date.now()}-${Math.random()}`;
  const selected = context.selectedModel
    ? providers.findIndex(provider => provider.id === context.selectedModel?.provider)
    : providers.findIndex(provider => provider.id === context.config?.provider);

  setTimeout(() => startProviderAuthCheck(context, providers, authCheckId), 0);

  return { id: 'models', layer: 'providers', selected: Math.max(0, selected), auth, authCheckId, spinnerFrame: 0 };
}

export function getHeight(modal: ModelsModalState) {
  if (modal.layer === 'providers') return Math.max(1, getModelProviders().length) + 7;
  if (modal.layer === 'subproviders') {
    const rows = Math.max(
      1,
      Math.min(MODEL_MODAL_MAX_ROWS, getSubProviders(getProviderModelOptions(modal.provider)).length),
    );
    return rows + 7;
  }
  if (modal.layer === 'models') {
    const rows = Math.max(
      1,
      Math.min(MODEL_MODAL_MAX_ROWS, getProviderModelOptions(modal.provider, modal.subProvider).length),
    );
    return rows + 7;
  }

  return 7;
}

export function render(props: ModalRenderProps<ModelsModalState>) {
  const state = props.modal;

  if (state.layer === 'providers') return <ProviderLayer {...props} modal={state} />;
  if (state.layer === 'subproviders') return <SubProvidersLayer {...props} modal={state} />;
  if (state.layer === 'models') return <ModelsLayer {...props} modal={state} />;
  if (state.layer === 'setup') return <SetupLayer {...props} modal={state} />;

  return null;
}

export const handleInput = createHandleInput<ModelsModalState>([
  {
    when: props => props.modal.layer === 'providers' && isProvidersInput(props),
    run: props => {
      if (props.modal.layer !== 'providers') return;
      handleProvidersInput(props.key, props.modal, props.context);
    },
  },
  {
    when: props => props.modal.layer === 'subproviders' && isSubProvidersInput(props),
    run: props => {
      if (props.modal.layer !== 'subproviders') return;
      handleSubProvidersInput(props.key, props.modal, props.context);
    },
  },
  {
    when: props => props.modal.layer === 'models' && isModelsInput(props),
    run: props => {
      if (props.modal.layer !== 'models') return;
      handleModelsInput(props.key, props.modal, props.context);
    },
  },
  {
    when: props => props.modal.layer === 'setup' && isSetupInput(props),
    run: props => {
      if (props.modal.layer !== 'setup') return;
      handleSetupInput(props.input, props.key, props.modal, props.context);
    },
  },
]);

function isProvidersInput(props: ModalInputProps<ModelsModalState>) {
  return isCancel(props) || isSubmit(props) || props.key.upArrow || props.key.downArrow;
}

function isSubProvidersInput(props: ModalInputProps<ModelsModalState>) {
  return (
    isCancel(props) ||
    isSubmit(props) ||
    props.key.leftArrow ||
    isBackspace(props) ||
    props.key.upArrow ||
    props.key.downArrow
  );
}

function isModelsInput(props: ModalInputProps<ModelsModalState>) {
  return (
    isCancel(props) ||
    isSubmit(props) ||
    props.key.leftArrow ||
    isBackspace(props) ||
    props.key.upArrow ||
    props.key.downArrow
  );
}

function isSetupInput(props: ModalInputProps<ModelsModalState>) {
  return isCancel(props) || isSubmit(props) || props.key.leftArrow || isBackspace(props) || isPlainTextInput(props);
}

function handleProvidersInput(key: ModalInputKey, state: ModelsProvidersState, context: ModalRenderContext) {
  const providers = getModelProviders();

  if (key.escape) {
    context.closeModal();
    return;
  }

  if (key.upArrow) {
    if (providers.length === 0) return;
    context.updateModal<ModelsProvidersState>({
      ...state,
      selected: (state.selected - 1 + providers.length) % providers.length,
      error: undefined,
    });
    return;
  }

  if (key.downArrow) {
    if (providers.length === 0) return;
    context.updateModal<ModelsProvidersState>({
      ...state,
      selected: (state.selected + 1) % providers.length,
      error: undefined,
    });
    return;
  }

  if (key.return) {
    const provider = providers[state.selected];
    if (!provider) return;
    const auth = getAuthStatus(state.auth, provider.id);

    if (auth.state === 'checking') {
      context.updateModal<ModelsProvidersState>({ ...state, error: `Checking ${provider.label} login...` });
      return;
    }

    if (auth.state === 'blocked') {
      context.updateModal<ModelsProvidersState>({ ...state, error: auth.message });
      return;
    }

    if (isProviderUsable(provider, context, state.auth)) {
      openNextForProvider(provider.id, context, state.auth);
      return;
    }

    if (!provider.requiresKey) {
      context.saveProviderConfig({ provider: provider.id, apiKey: '' });
      openNextForProvider(provider.id, context, state.auth);
      return;
    }

    context.updateModal<ModelsSetupState>({
      id: 'models',
      layer: 'setup',
      provider: provider.id,
      apiKey: '',
      auth: state.auth,
      authCheckId: state.authCheckId,
      spinnerFrame: state.spinnerFrame,
    });
  }
}

function handleSubProvidersInput(key: ModalInputKey, state: ModelsSubProvidersState, context: ModalRenderContext) {
  const subProviders = getSubProviders(getProviderModelOptions(state.provider));
  const providerIndex = Math.max(
    0,
    getModelProviders().findIndex(p => p.id === state.provider),
  );

  if (key.escape) {
    context.closeModal();
    return;
  }

  if (key.leftArrow || key.backspace || key.delete) {
    context.updateModal<ModelsProvidersState>({
      id: 'models',
      layer: 'providers',
      selected: providerIndex,
      auth: state.auth,
      authCheckId: state.authCheckId,
      spinnerFrame: state.spinnerFrame,
    });
    return;
  }

  if (key.upArrow) {
    if (subProviders.length === 0) return;
    context.updateModal<ModelsSubProvidersState>({
      ...state,
      selected: (state.selected - 1 + subProviders.length) % subProviders.length,
    });
    return;
  }

  if (key.downArrow) {
    if (subProviders.length === 0) return;
    context.updateModal<ModelsSubProvidersState>({
      ...state,
      selected: (state.selected + 1) % subProviders.length,
    });
    return;
  }

  if (key.return) {
    const sp = subProviders[state.selected];
    if (sp) openModelsForProvider(state.provider, sp.id, context, state.auth);
  }
}

function handleModelsInput(key: ModalInputKey, state: ModelsListState, context: ModalRenderContext) {
  const providerIndex = Math.max(
    0,
    getModelProviders().findIndex(provider => provider.id === state.provider),
  );
  const modelOptions = getProviderModelOptions(state.provider, state.subProvider);

  if (key.escape) {
    context.closeModal();
    return;
  }

  if (key.leftArrow || key.backspace || key.delete) {
    if (state.subProvider !== null) {
      const subProviders = getSubProviders(getProviderModelOptions(state.provider));
      const subProviderIndex = Math.max(
        0,
        subProviders.findIndex(sp => sp.id === state.subProvider),
      );
      context.updateModal<ModelsSubProvidersState>({
        id: 'models',
        layer: 'subproviders',
        provider: state.provider,
        selected: subProviderIndex,
        auth: state.auth,
        authCheckId: state.authCheckId,
        spinnerFrame: state.spinnerFrame,
      });
    } else {
      context.updateModal<ModelsProvidersState>({
        id: 'models',
        layer: 'providers',
        selected: providerIndex,
        auth: state.auth,
        authCheckId: state.authCheckId,
        spinnerFrame: state.spinnerFrame,
      });
    }
    return;
  }

  if (key.upArrow) {
    if (modelOptions.length === 0) return;
    context.updateModal<ModelsListState>({
      ...state,
      selected: (state.selected - 1 + modelOptions.length) % modelOptions.length,
    });
    return;
  }

  if (key.downArrow) {
    if (modelOptions.length === 0) return;
    context.updateModal<ModelsListState>({
      ...state,
      selected: (state.selected + 1) % modelOptions.length,
    });
    return;
  }

  if (key.return) {
    const modelOption = modelOptions[state.selected];
    if (modelOption) {
      const reasoningEffort = modelOption.reasoningLevels.some(
        level => level.value === context.preferences.reasoningEffort,
      )
        ? context.preferences.reasoningEffort
        : (getDefaultReasoningLevel(modelOption)?.value ?? context.preferences.reasoningEffort);

      context.updatePreferences({
        modelProvider: state.provider,
        model: modelOption.model,
        reasoningEffort,
      });
    }
    context.closeModal();
  }
}

function handleSetupInput(input: string, key: ModalInputKey, state: ModelsSetupState, context: ModalRenderContext) {
  const providerIndex = Math.max(
    0,
    getModelProviders().findIndex(provider => provider.id === state.provider),
  );

  if (key.escape) {
    context.closeModal();
    return;
  }

  if (key.leftArrow) {
    context.updateModal<ModelsProvidersState>({
      id: 'models',
      layer: 'providers',
      selected: providerIndex,
      auth: state.auth,
      authCheckId: state.authCheckId,
      spinnerFrame: state.spinnerFrame,
    });
    return;
  }

  if (key.return) {
    const apiKey = state.apiKey.trim();
    if (!apiKey) {
      context.updateModal<ModelsSetupState>({ ...state, error: 'API key is required.' });
      return;
    }

    context.saveProviderConfig({ provider: state.provider, apiKey });
    openNextForProvider(state.provider, context, state.auth);
    return;
  }

  if (key.backspace || key.delete) {
    context.updateModal<ModelsSetupState>({ ...state, apiKey: state.apiKey.slice(0, -1), error: undefined });
    return;
  }

  if (!key.ctrl && !key.meta && !key.tab && input) {
    context.updateModal<ModelsSetupState>({ ...state, apiKey: state.apiKey + input, error: undefined });
  }
}

function openModelsForProvider(
  provider: Provider,
  subProvider: string | null,
  context: ModalRenderContext,
  auth: ModelsModalState['auth'],
) {
  const currentModels = getProviderModelOptions(provider, subProvider);
  const selected =
    context.selectedModel?.provider === provider
      ? currentModels.findIndex(modelOption => modelOption.model === context.selectedModel?.name)
      : 0;

  context.updateModal<ModelsListState>(current => {
    return {
      id: 'models',
      layer: 'models',
      provider,
      subProvider,
      selected: Math.max(0, selected),
      auth,
      authCheckId: current.authCheckId,
      spinnerFrame: current.spinnerFrame,
    } satisfies ModelsListState;
  });
}

function openSubProvidersForProvider(provider: Provider, context: ModalRenderContext, auth: ModelsModalState['auth']) {
  const allModels = getProviderModelOptions(provider);
  const subProviders = getSubProviders(allModels);
  let selected = 0;
  if (context.selectedModel?.provider === provider) {
    const currentSubId = allModels.find(m => m.model === context.selectedModel?.name)?.group?.id;
    if (currentSubId) {
      const idx = subProviders.findIndex(sp => sp.id === currentSubId);
      if (idx >= 0) selected = idx;
    }
  }

  context.updateModal<ModelsSubProvidersState>(current => {
    return {
      id: 'models',
      layer: 'subproviders',
      provider,
      selected,
      auth,
      authCheckId: current.authCheckId,
      spinnerFrame: current.spinnerFrame,
    } satisfies ModelsSubProvidersState;
  });
}

function openNextForProvider(provider: Provider, context: ModalRenderContext, auth: ModelsModalState['auth']) {
  const subProviders = getSubProviders(getProviderModelOptions(provider));
  if (subProviders.length > 1) {
    openSubProvidersForProvider(provider, context, auth);
  } else {
    openModelsForProvider(provider, null, context, auth);
  }
}
