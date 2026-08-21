#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const sourceRoot = path.join(projectRoot, 'src');
const outputRoot = path.join(projectRoot, 'dist');
const errors = [];

if (packageJson.bin?.openstudy !== 'dist/index.js')
  errors.push('package.json must expose dist/index.js as the openstudy bin.');
if (packageJson.main !== 'dist/index.js') errors.push('package.json main must match the CLI entry point.');
if (!Array.isArray(packageJson.files) || packageJson.files.length !== 1 || packageJson.files[0] !== 'dist') {
  errors.push('package.json files must publish dist only.');
}
if (packageJson.engines?.node !== '>=22')
  errors.push('package.json must declare the Ink-compatible Node.js >=22 runtime.');

const entryPoint = path.join(outputRoot, 'index.js');
if (!fs.existsSync(entryPoint)) {
  errors.push('dist/index.js is missing; run npm run build first.');
} else if (!fs.readFileSync(entryPoint, 'utf8').startsWith('#!/usr/bin/env node\n')) {
  errors.push('dist/index.js must preserve the CLI shebang.');
}

if (fs.existsSync(sourceRoot) && fs.existsSync(outputRoot)) {
  const expected = new Set(
    walk(sourceRoot)
      .filter(file => /\.tsx?$/.test(file) && !file.endsWith('.d.ts'))
      .map(file => `${path.relative(sourceRoot, file).replace(/\.tsx?$/, '')}.js`),
  );
  const actual = new Set(
    walk(outputRoot)
      .filter(file => file.endsWith('.js'))
      .map(file => path.relative(outputRoot, file)),
  );

  for (const file of expected) {
    if (!actual.has(file)) errors.push(`Compiled output is missing: dist/${file}`);
  }
  for (const file of actual) {
    if (!expected.has(file)) errors.push(`Compiled output is stale: dist/${file}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Package metadata and compiled output are consistent.');
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
