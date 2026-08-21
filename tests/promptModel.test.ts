import assert from 'node:assert/strict';
import test from 'node:test';
import type { CommandModule } from '../src/commands/types.ts';
import { getCommandSuggestions, wrapInput } from '../src/shared/ui/prompt-model.ts';

const noop = () => {};
const commands: CommandModule[] = [
  { config: { name: 'sessions', description: 'Open saved sessions' }, execute: noop },
  { config: { name: 'setup', description: 'Configure a provider' }, execute: noop },
  { config: { name: 'exit', description: 'Close OpenStudy' }, execute: noop },
];

test('command suggestions prefer prefix matches and search descriptions', () => {
  assert.deepEqual(
    getCommandSuggestions(commands, 'se', 10).map(command => command.config.name),
    ['sessions', 'setup', 'exit'],
  );
  assert.deepEqual(
    getCommandSuggestions(commands, 'provider', 10).map(command => command.config.name),
    ['setup'],
  );
});

test('prompt wrapping handles narrow inputs', () => {
  assert.deepEqual(wrapInput('abcdef', 2), ['ab', 'cd', 'ef']);
  assert.deepEqual(wrapInput('', 0), ['']);
});
