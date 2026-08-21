import React from 'react';
import { getModalManifest, loadModalModule, MODAL_REGISTRY } from '../../modals/registry.js';
import type {
  ActiveModal,
  ModalId,
  ModalInitialStateMap,
  ModalManifest,
  ModalRenderContext,
  ModalScreen,
  ModalState,
  ModalTrigger,
  OpenModal,
  SelectedModel,
} from '../../modals/types.js';
import type { SubjectOption } from '../../options/index.js';
import type { ActiveProviderConfig, Provider } from '../../domain/provider.js';
import type { SessionSettings } from '../../domain/study.js';

export interface ModalManagerOptions {
  screen: ModalScreen;
  session: SessionSettings;
  activeSessionId: string | null;
  config: ActiveProviderConfig | null;
  selectedSubject: SubjectOption | null;
  selectedModel: SelectedModel | null;
  updateSettings: (patch: Partial<SessionSettings>) => SessionSettings;
  setSession: (sessionId: string) => SessionSettings | null;
  isProviderConfigured: (provider: Provider) => boolean;
}

export interface ModalManager {
  modal: ActiveModal | null;
  context: ModalRenderContext;
  triggers: ModalTrigger[];
  open: OpenModal;
  close: () => void;
  update: (updater: ModalState | ((current: ModalState) => ModalState)) => void;
  executeTrigger: (trigger: ModalTrigger) => void;
}

export function useModalManager(options: ModalManagerOptions): ModalManager {
  const [modal, setModal] = React.useState<ActiveModal | null>(null);
  const contextRef = React.useRef<ModalRenderContext | null>(null);

  const close = React.useCallback(() => setModal(null), []);
  const update = React.useCallback(<S extends ModalState>(updater: S | ((current: S) => S)) => {
    setModal(current => {
      if (!current) return current;
      // The manager stores the open modal erased to its base state; callers
      // narrow via the generic parameter.
      const state =
        typeof updater === 'function' ? (updater as (current: never) => ModalState)(current.state as never) : updater;
      return { ...current, state };
    });
  }, []);

  const open = React.useCallback(
    async <Id extends ModalId>(id: Id, initialState?: ModalInitialStateMap[Id]) => {
      const manifest = getModalManifest(id);
      const module = await loadModalModule(id);
      const context = contextRef.current;
      if (!manifest || !isAvailable(manifest, options.screen) || !module || !context) return;

      const state = await module.open(context, initialState as Record<string, unknown> | undefined);
      if (state) setModal({ id, module, state });
    },
    [options.screen],
  );

  const context = React.useMemo<ModalRenderContext>(
    () => ({
      session: options.session,
      activeSessionId: options.activeSessionId,
      config: options.config,
      selectedSubject: options.selectedSubject,
      selectedModel: options.selectedModel,
      openModal: open,
      closeModal: close,
      updateModal: update,
      updateSettings: options.updateSettings,
      setSession: options.setSession,
      isProviderConfigured: options.isProviderConfigured,
    }),
    [
      close,
      open,
      options.activeSessionId,
      options.config,
      options.isProviderConfigured,
      options.selectedModel,
      options.selectedSubject,
      options.session,
      options.setSession,
      options.updateSettings,
      update,
    ],
  );

  React.useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const triggers = React.useMemo(
    () =>
      MODAL_REGISTRY.flatMap(manifest =>
        isAvailable(manifest, options.screen) && manifest.trigger ? [manifest.trigger] : [],
      ),
    [options.screen],
  );

  const executeTrigger = React.useCallback(
    (trigger: ModalTrigger) => {
      const manifest = getModalManifest(trigger.id);
      if (manifest) void open(manifest.id);
    },
    [open],
  );

  return { modal, context, triggers, open, close, update, executeTrigger };
}

function isAvailable(manifest: ModalManifest, screen: ModalScreen): boolean {
  return manifest.Screen === null || manifest.Screen === screen;
}
