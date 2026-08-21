export interface CommandConfig {
  name: string;
  description: string;
}

export interface CommandContext {
  onExit: () => void;
  onSetup: () => void;
  openModal: OpenModal;
  closeModal: () => void;
}

export interface CommandModule {
  config: CommandConfig;
  execute: (context: CommandContext) => void | Promise<void>;
}
import type { OpenModal } from '../modals/types.js';
