import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

const DEFAULT_MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_EXTENSIONS = new Set([
  '.csv',
  '.doc',
  '.docx',
  '.epub',
  '.json',
  '.md',
  '.markdown',
  '.odp',
  '.ods',
  '.odt',
  '.pdf',
  '.ppt',
  '.pptx',
  '.rtf',
  '.tex',
  '.tsv',
  '.txt',
  '.xls',
  '.xlsx',
  '.xml',
  '.yaml',
  '.yml',
]);

export interface MaterialEntry {
  name: string;
  path: string;
  type: 'directory' | 'file';
  modifiedAt?: number;
}

export interface MaterialDirectory {
  path: string;
  entries: MaterialEntry[];
  error?: string;
}

export interface ResolvedMaterial {
  location: string;
  workingDirectory?: string;
}

export interface MaterialServiceOptions {
  homeDirectory?: string;
  documentsDirectory?: string;
  fetch?: typeof globalThis.fetch;
  maxDownloadBytes?: number;
  spawn?: (command: string, args: string[]) => SpawnSyncReturns<string>;
}

export class MaterialService {
  readonly homeDirectory: string;
  readonly documentsDirectory: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly maxDownloadBytes: number;
  private readonly spawn: (command: string, args: string[]) => SpawnSyncReturns<string>;

  constructor(options: MaterialServiceOptions = {}) {
    this.homeDirectory = path.resolve(options.homeDirectory ?? os.homedir());
    this.documentsDirectory = path.resolve(
      options.documentsDirectory ?? path.join(this.homeDirectory, '.openstudy', 'documents'),
    );
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.maxDownloadBytes = options.maxDownloadBytes ?? DEFAULT_MAX_DOWNLOAD_BYTES;
    this.spawn =
      options.spawn ??
      ((command, args) =>
        spawnSync(command, args, {
          encoding: 'utf8',
          timeout: 1000,
        }));
  }

  listDirectory(directory: string): MaterialDirectory {
    const requested = path.resolve(directory);
    const current = this.isInsideHome(requested) ? requested : this.homeDirectory;

    try {
      const entries = fs
        .readdirSync(current, { withFileTypes: true })
        .filter(
          entry =>
            (entry.isDirectory() && !entry.name.startsWith('.')) || (entry.isFile() && isDocumentFile(entry.name)),
        )
        .map(entry => {
          const entryPath = path.join(current, entry.name);
          let modifiedAt: number | undefined;
          try {
            modifiedAt = fs.statSync(entryPath).mtimeMs;
          } catch {
            // An unreadable modification date should not hide an otherwise useful entry.
          }

          return {
            name: entry.name,
            path: entryPath,
            type: entry.isDirectory() ? ('directory' as const) : ('file' as const),
            modifiedAt,
          };
        })
        .sort(compareEntries);

      return { path: current, entries };
    } catch (error) {
      return { path: current, entries: [], error: errorMessage(error) };
    }
  }

  parentOf(directory: string): string | null {
    const current = path.resolve(directory);
    if (current === this.homeDirectory) return null;

    const parent = path.dirname(current);
    return parent !== current && this.isInsideHome(parent) ? parent : null;
  }

  assertReadable(filePath: string): void {
    fs.accessSync(filePath, fs.constants.R_OK);
  }

  resolve(value: string): ResolvedMaterial {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return { location: parseMaterialUrl(trimmed).href };
    }

    const location = path.resolve(trimmed);
    this.assertReadable(location);
    return { location, workingDirectory: path.dirname(location) };
  }

  readClipboard(): string | null {
    const commands: Array<[string, string[]]> = [
      ['wl-paste', ['--no-newline']],
      ['xclip', ['-selection', 'clipboard', '-o']],
      ['xsel', ['--clipboard', '--output']],
    ];

    for (const [command, args] of commands) {
      const result = this.spawn(command, args);
      if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
    }

    return null;
  }

  async importUrl(rawUrl: string, signal?: AbortSignal): Promise<string> {
    const url = parseMaterialUrl(rawUrl);
    const response = await this.fetchImpl(url, { signal });
    if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`);

    const contentType = response.headers.get('content-type') ?? '';
    const filename = getDownloadFilename(url, response.headers.get('content-disposition'), contentType);
    if (!isDocumentFile(filename) && !isDocumentContentType(contentType)) {
      throw new Error('That URL does not look like a supported document.');
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > this.maxDownloadBytes) {
      throw new Error(`The document is larger than the ${formatBytes(this.maxDownloadBytes)} download limit.`);
    }

    const data = Buffer.from(await response.arrayBuffer());
    if (data.byteLength > this.maxDownloadBytes) {
      throw new Error(`The document is larger than the ${formatBytes(this.maxDownloadBytes)} download limit.`);
    }

    fs.mkdirSync(this.documentsDirectory, { recursive: true });
    const target = this.uniqueDocumentPath(filename);
    fs.writeFileSync(target, data, { flag: 'wx' });
    this.assertReadable(target);
    return target;
  }

  shortenPath(value: string): string {
    return value.startsWith(this.homeDirectory) ? `~${value.slice(this.homeDirectory.length)}` : value;
  }

  isInsideHome(value: string): boolean {
    const resolved = path.resolve(value);
    return resolved === this.homeDirectory || resolved.startsWith(`${this.homeDirectory}${path.sep}`);
  }

  private uniqueDocumentPath(filename: string): string {
    const extension = path.extname(filename);
    const baseName = path.basename(filename, extension);
    let candidate = path.join(this.documentsDirectory, filename);
    let counter = 1;

    while (fs.existsSync(candidate)) {
      candidate = path.join(this.documentsDirectory, `${baseName}-${counter}${extension}`);
      counter += 1;
    }

    return candidate;
  }
}

export const materialService = new MaterialService();

export function parseMaterialUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error('URL is required.');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }

  return parsed;
}

export function isDocumentFile(name: string): boolean {
  return DOCUMENT_EXTENSIONS.has(path.extname(name).toLowerCase());
}

export function isDocumentContentType(contentType: string): boolean {
  const type = normalizedContentType(contentType);
  return type.startsWith('text/') || DOCUMENT_CONTENT_TYPES.has(type);
}

function compareEntries(a: MaterialEntry, b: MaterialEntry): number {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
  if (a.modifiedAt !== undefined && b.modifiedAt !== undefined && a.modifiedAt !== b.modifiedAt) {
    return b.modifiedAt - a.modifiedAt;
  }
  if (a.modifiedAt !== undefined && b.modifiedAt === undefined) return -1;
  if (a.modifiedAt === undefined && b.modifiedAt !== undefined) return 1;
  return a.name.localeCompare(b.name);
}

function getDownloadFilename(url: URL, contentDisposition: string | null, contentType: string): string {
  const dispositionName = contentDisposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i)?.[1];
  const urlName = path.basename(decodeURIComponent(url.pathname));
  const rawName = sanitizeFilename(dispositionName ?? (urlName || 'document'));
  const extension = path.extname(rawName) || extensionFromContentType(contentType) || '.txt';
  const baseName = path.basename(rawName, path.extname(rawName)) || 'document';
  return `${baseName}${extension}`;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'document';
}

function normalizedContentType(contentType: string): string {
  return contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function extensionFromContentType(contentType: string): string | null {
  const type = normalizedContentType(contentType);
  const extension = CONTENT_TYPE_EXTENSIONS[type];
  if (extension) return extension;
  return type.startsWith('text/') ? '.txt' : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'application/epub+zip': '.epub',
  'application/json': '.json',
  'application/msword': '.doc',
  'application/pdf': '.pdf',
  'application/rtf': '.rtf',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.oasis.opendocument.presentation': '.odp',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/xml': '.xml',
  'text/csv': '.csv',
  'text/markdown': '.md',
  'text/plain': '.txt',
  'text/tab-separated-values': '.tsv',
  'text/xml': '.xml',
  'text/yaml': '.yaml',
};

const DOCUMENT_CONTENT_TYPES = new Set([
  'application/csv',
  ...Object.keys(CONTENT_TYPE_EXTENSIONS).filter(type => type.startsWith('application/')),
]);
