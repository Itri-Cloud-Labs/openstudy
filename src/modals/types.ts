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

/** Base constraint every modal state must satisfy; concrete states narrow `id`. */
export type ModalState = { id: ModalId };

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
  updateModal: <S extends ModalState>(updater: S | ((current: S) => S)) => void;
  updateSettings: (patch: Partial<SessionSettings>) => SessionSettings;
  setSession: (sessionId: string) => SessionSettings | null;
}

export interface ModalModule<S extends ModalState = ModalState> {
  open(context: ModalContext, initialState?: Record<string, unknown>): S | null | Promise<S | null>;
  getHeight(modal: S): number;
  render(props: ModalRenderProps<S>): React.ReactNode;
  handleInput?(props: ModalInputProps<S>): boolean;
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

export interface ModalRenderProps<S extends ModalState = ModalState> {
  modal: S;
  context: ModalRenderContext;
}

export interface ModalInputProps<S extends ModalState = ModalState> {
  input: string;
  key: ModalInputKey;
  modal: S;
  context: ModalRenderContext;
}

export interface ActiveModal {
  id: ModalId;
  module: ModalModule;
  state: ModalState;
}
