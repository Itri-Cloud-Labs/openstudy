#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

if (packageJson.name !== 'openstudy') {
  throw new Error(`Refusing to clean unexpected project: ${String(packageJson.name)}`);
}

fs.rmSync(path.join(projectRoot, 'dist'), { recursive: true, force: true });
