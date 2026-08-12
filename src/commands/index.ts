import * as exitCommand from './exit.js';
import * as sessionsCommand from './sessions.js';
import * as setupCommand from './setup.js';
import type { CommandModule } from './types.js';

export type { CommandConfig, CommandContext, CommandModule } from './types.js';

const commands: CommandModule[] = [
  exitCommand,
  sessionsCommand,
  setupCommand,
].sort((a, b) => a.config.name.localeCompare(b.config.name));

export async function loadCommands(): Promise<CommandModule[]> {
  return commands;
}
