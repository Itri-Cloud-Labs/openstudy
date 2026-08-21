import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MaterialService, parseMaterialUrl } from '../src/infrastructure/materials/material-service.ts';

function withTemporaryHome(run: (home: string) => void | Promise<void>) {
  return async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'openstudy-materials-'));
    try {
      await run(home);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  };
}

test(
  'material browsing stays inside home and lists supported documents',
  withTemporaryHome(home => {
    fs.mkdirSync(path.join(home, 'notes'));
    fs.writeFileSync(path.join(home, 'study.pdf'), 'pdf');
    fs.writeFileSync(path.join(home, 'ignore.exe'), 'binary');
    fs.mkdirSync(path.join(home, '.hidden'));
    const service = new MaterialService({ homeDirectory: home });

    assert.deepEqual(
      service.listDirectory(home).entries.map(entry => [entry.name, entry.type]),
      [
        ['notes', 'directory'],
        ['study.pdf', 'file'],
      ],
    );
    assert.equal(service.listDirectory(path.dirname(home)).path, home);
    assert.equal(service.parentOf(home), null);
  }),
);

test('material URLs accept only HTTP and HTTPS', () => {
  assert.equal(parseMaterialUrl('https://example.com/notes.pdf').protocol, 'https:');
  assert.throws(() => parseMaterialUrl('file:///tmp/notes.pdf'), /Only HTTP and HTTPS/);
  assert.throws(() => parseMaterialUrl('not a URL'), /valid URL/);
});

test(
  'URL imports reject unsupported content and oversized files',
  withTemporaryHome(async home => {
    const unsupported = new MaterialService({
      homeDirectory: home,
      fetch: async () => new Response('binary', { headers: { 'content-type': 'application/octet-stream' } }),
    });
    await assert.rejects(unsupported.importUrl('https://example.com/file.bin'), /supported document/);

    const oversized = new MaterialService({
      homeDirectory: home,
      maxDownloadBytes: 3,
      fetch: async () => new Response('large', { headers: { 'content-type': 'text/plain' } }),
    });
    await assert.rejects(oversized.importUrl('https://example.com/notes.txt'), /download limit/);
  }),
);

test(
  'URL imports choose unique filenames without overwriting existing documents',
  withTemporaryHome(async home => {
    const service = new MaterialService({
      homeDirectory: home,
      fetch: async () => new Response('notes', { headers: { 'content-type': 'text/plain' } }),
    });

    const first = await service.importUrl('https://example.com/notes.txt');
    const second = await service.importUrl('https://example.com/notes.txt');
    assert.equal(path.basename(first), 'notes.txt');
    assert.equal(path.basename(second), 'notes-1.txt');
    assert.equal(fs.readFileSync(first, 'utf8'), 'notes');
  }),
);
