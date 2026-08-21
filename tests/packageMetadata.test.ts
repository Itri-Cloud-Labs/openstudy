import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
) as Record<string, unknown>;

test('package metadata targets the supported CLI runtime', () => {
  assert.deepEqual(packageJson.bin, { openstudy: 'dist/index.js' });
  assert.equal(packageJson.main, 'dist/index.js');
  assert.deepEqual(packageJson.files, ['dist']);
  assert.deepEqual(packageJson.engines, { node: '>=22', npm: '>=10' });
});

test('package scripts enforce clean, validated releases', () => {
  const scripts = packageJson.scripts as Record<string, string>;

  assert.match(scripts.build, /npm run clean/);
  assert.match(scripts.check, /npm run typecheck/);
  assert.match(scripts.check, /npm run build/);
  assert.match(scripts.check, /npm run package:check/);
  assert.equal(scripts.prepack, 'npm run check');
});
