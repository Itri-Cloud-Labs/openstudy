import type React from 'react';
import type { useInput } from 'ink';
import type { SubjectOption } from '../options/index.js';
import type { ActiveProviderConfig, Provider } from '../domain/provider.js';
import type { SessionSettings } from '../domain/study.js';

export interface SelectedModel {
  provider: Provider;
  name: string;
}

export type ModalId =
  | 'devtools'
  | 'filepicker'
  | 'language'
  | 'message'
  | 'models'
  | 'reasoning'
  | 'sessions'
  | 'subjects';

export interface ModalInitialStateMap {
  devtools: undefined;
  filepicker: undefined;
  language: undefined;
  message: { title?: string; message?: string };
  models: undefined;
  reasoning: undefined;
  sessions: undefined;
  subjects: undefined;
}

export type OpenModal = <Id extends ModalId>(id: Id, initialState?: ModalInitialStateMap[Id]) => void | Promise<void>;

export type ModalScreen = 'home' | 'session';

export interface ModalState {
  id: ModalId;
  [key: string]: unknown;
}

export type ModalInputKey = Parameters<Parameters<typeof useInput>[0]>[1];

export interface ModalTrigger {
  id: ModalId;
  key: string;
  label: string;
  description: string;
  input?: string;
  ctrl?: boolean;
  tab?: boolean;
}

export interface ModalContext {
  session: SessionSettings;
  activeSessionId: string | null;
  config: ActiveProviderConfig | null;
  selectedSubject: SubjectOption | null;
  selectedModel: SelectedModel | null;
  openModal: OpenModal;
  closeModal: () => void;
  updateModal: (updater: ModalState | ((current: ModalState) => ModalState)) => void;
  updateSettings: (patch: Partial<SessionSettings>) => SessionSettings;
  setSession: (sessionId: string) => SessionSettings | null;
}

export interface ModalModule {
  open: (
    context: ModalContext,
    initialState?: Record<string, unknown>,
  ) => ModalState | null | Promise<ModalState | null>;
  getHeight: (modal: ModalState) => number;
  render: (props: ModalRenderProps) => React.ReactNode;
  handleInput?: (props: ModalInputProps) => boolean;
}

export interface ModalManifest<Id extends ModalId = ModalId> {
  id: Id;
  Screen: ModalScreen | null;
  trigger?: ModalTrigger;
  load: () => Promise<ModalModule>;
}

export interface ModalRenderContext extends ModalContext {
  isProviderConfigured: (provider: Provider) => boolean;
}

export interface ModalRenderProps {
  modal: ModalState;
  context: ModalRenderContext;
}

export interface ModalInputProps {
  input: string;
  key: ModalInputKey;
  modal: ModalState;
  context: ModalRenderContext;
}

export interface ActiveModal {
  id: ModalId;
  module: ModalModule;
  state: ModalState;
}
