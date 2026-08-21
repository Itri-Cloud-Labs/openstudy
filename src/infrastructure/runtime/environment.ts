import os from 'node:os';

export function getHomeDirectory(): string {
  return os.homedir();
}

export function getWorkingDirectory(): string {
  return process.cwd();
}
