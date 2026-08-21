import path from 'node:path';

export function truncate(value: string, maxLength: number, suffix = '...'): string {
  if (value.length <= maxLength) return value;
  if (maxLength <= suffix.length) return suffix.slice(0, maxLength);
  return `${value.slice(0, maxLength - suffix.length)}${suffix}`;
}

export function formatMaterialLabel(material: string | null, maxLength = 50): string {
  if (!material) return 'Material';

  const normalized = material.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) return truncate(normalized, maxLength);

  const parent = path.basename(path.dirname(normalized));
  const file = path.basename(normalized);
  const label = !parent || parent === '.' || parent === path.sep ? file : `${parent}/${file}`;
  return truncate(label, maxLength);
}

export function shortenHomePath(value: string, homeDirectory: string): string {
  return value.startsWith(homeDirectory) ? `~${value.slice(homeDirectory.length)}` : value;
}

export function truncateError(message: string, maxLength = 54): string {
  const normalized = message.replace(/\s+/g, ' ').trim();
  return truncate(normalized, maxLength, '…');
}
