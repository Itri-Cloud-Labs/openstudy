import path from 'node:path';
import type { ProviderPromptFile, ProviderPromptOptions } from './contracts.js';

export function resolvePromptFiles(options: ProviderPromptOptions): Array<{ path: string }> {
  return [options.file, ...(options.files ?? [])]
    .filter((file): file is ProviderPromptFile => Boolean(file))
    .map(file => (typeof file === 'string' ? { path: file } : file));
}

export function buildMaterialPrompt(input: string, files: Array<{ path: string }>): string {
  if (files.length === 0) return input;

  return [
    input,
    '',
    'Use the attached study material as the only source of truth.',
    ...files.map(file =>
      isRemoteMaterial(file.path) ? `- URL: ${file.path}` : `- Local file: ${path.resolve(file.path)}`,
    ),
    'Read the referenced material directly before answering.',
  ].join('\n');
}

export function isRemoteMaterial(materialPath: string): boolean {
  return materialPath.startsWith('http://') || materialPath.startsWith('https://');
}
