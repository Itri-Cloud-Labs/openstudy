import fs from 'fs';
import path from 'path';

export type JsonReadResult =
  | { status: 'missing' }
  | { status: 'invalid'; error: Error }
  | { status: 'ready'; value: unknown };

let temporaryFileCounter = 0;

export function readJson(pathname: string): JsonReadResult {
  if (!fs.existsSync(pathname)) return { status: 'missing' };

  try {
    return {
      status: 'ready',
      value: JSON.parse(fs.readFileSync(pathname, 'utf8')) as unknown,
    };
  } catch (error) {
    return {
      status: 'invalid',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/** Write a complete JSON document via a same-directory rename. */
export function writeJsonAtomic(pathname: string, value: unknown): void {
  const directory = path.dirname(pathname);
  fs.mkdirSync(directory, { recursive: true });

  temporaryFileCounter += 1;
  const temporaryPath = path.join(directory, `.${path.basename(pathname)}.${process.pid}.${temporaryFileCounter}.tmp`);
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  let descriptor: number | null = null;

  try {
    descriptor = fs.openSync(temporaryPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, serialized, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(temporaryPath, pathname);
  } catch (error) {
    if (descriptor !== null) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // Preserve the original write error.
      }
    }

    try {
      fs.unlinkSync(temporaryPath);
    } catch {
      // The rename may already have completed.
    }

    throw error;
  }
}
