import { readFileSync } from 'node:fs';

interface PackageMetadata {
  name?: string;
  version?: string;
}

function readPackageMetadata(): PackageMetadata {
  try {
    return JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as PackageMetadata;
  } catch {
    return {};
  }
}

const packageMetadata = readPackageMetadata();

export const APP_NAME = 'OpenStudy';
export const APP_VERSION = packageMetadata.version ?? '0.0.0';
