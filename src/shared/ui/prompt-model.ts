import type { CommandModule } from '../../commands/types.js';

export function getCommandSuggestions(
  commands: readonly CommandModule[],
  query: string,
  maximum: number,
): CommandModule[] {
  const normalized = query.toLowerCase();
  return [...commands]
    .map(command => {
      const values = [command.config.name, command.config.description].map(value => value.toLowerCase());
      const starts = values.some(value => value.startsWith(normalized));
      const includes = values.some(value => value.includes(normalized));
      return starts || includes ? { command, score: starts ? 0 : 1 } : null;
    })
    .filter((item): item is { command: CommandModule; score: number } => item !== null)
    .sort((a, b) => a.score - b.score || a.command.config.name.localeCompare(b.command.config.name))
    .slice(0, maximum)
    .map(item => item.command);
}

export function wrapInput(text: string, width: number): string[] {
  if (!text) return [''];
  const safeWidth = Math.max(1, width);
  const lines: string[] = [];
  for (let index = 0; index < text.length; index += safeWidth) {
    lines.push(text.slice(index, index + safeWidth));
  }
  return lines.length > 0 ? lines : [''];
}
