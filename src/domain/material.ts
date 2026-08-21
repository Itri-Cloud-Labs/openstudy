export type MaterialRef = { kind: 'file'; path: string } | { kind: 'url'; url: string };

export function materialRefFromLegacy(value: unknown): MaterialRef | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;

  return /^https?:\/\//iu.test(value) ? { kind: 'url', url: value } : { kind: 'file', path: value };
}

export function materialRefToLegacy(material: MaterialRef | null): string | null {
  if (!material) return null;
  return material.kind === 'url' ? material.url : material.path;
}
