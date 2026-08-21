import fs from 'node:fs';

export function erasePersistenceRoot(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}
