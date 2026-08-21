import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createDefaultAppPreferences } from '../src/domain/study.ts';
import { createPersistence } from '../src/infrastructure/persistence/repository.ts';

function withTemporaryRoot(run: (root: string) => void | Promise<void>) {
  return async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openstudy-persistence-'));
    try {
      await run(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

test(
  'persistence reads do not create files or directories',
  withTemporaryRoot(root => {
    const storageRoot = path.join(root, 'state');
    const persistence = createPersistence({ rootDir: storageRoot });

    assert.equal(persistence.readProviderConfig(), null);
    assert.equal(persistence.readAppPreferences(), null);
    assert.deepEqual(persistence.listStudySessions(), []);
    assert.equal(fs.existsSync(storageRoot), false);
    assert.equal(persistence.isFirstLaunch(), true);
  }),
);

test(
  'session creation uses injected ids and clocks and stores an immutable settings snapshot',
  withTemporaryRoot(root => {
    const persistence = createPersistence({
      rootDir: root,
      clock: () => new Date('2026-08-21T10:00:00.000Z'),
      idGenerator: () => 'session-1',
    });
    const preferences = {
      ...createDefaultAppPreferences(),
      subject: 'Mathematics',
      studyLanguage: 'French',
    };

    const created = persistence.createStudySession({ preferences });
    preferences.subject = 'Physics';

    assert.equal(created.id, 'session-1');
    assert.equal(created.createdAt, '2026-08-21T10:00:00.000Z');
    assert.equal(persistence.readStudySession('session-1')?.preferences.subject, 'Mathematics');
  }),
);

test(
  'written documents round-trip through reads',
  withTemporaryRoot(root => {
    const persistence = createPersistence({ rootDir: root });

    persistence.writeProviderConfig({ provider: 'codex', apiKey: 'secret' });
    assert.deepEqual(persistence.readProviderConfig(), { provider: 'codex', apiKey: 'secret' });

    const preferences = { ...createDefaultAppPreferences(), subject: 'Biology' };
    const record = persistence.writeAppPreferences(preferences, {
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(record.preferences.subject, 'Biology');
    assert.equal(persistence.readAppPreferences()?.createdAt, '2026-01-01T00:00:00.000Z');

    const session = persistence.createStudySession({ title: null, preferences });
    const touched = persistence.touchStudySession(session.id);
    assert.ok(touched);
    assert.equal(touched.id, session.id);

    assert.deepEqual(
      persistence.listStudySessions().map(item => item.id),
      [session.id],
    );
  }),
);

test(
  'atomic writes leave no temporary files behind',
  withTemporaryRoot(root => {
    const persistence = createPersistence({ rootDir: root });
    persistence.writeProviderConfig({ provider: 'opencode', apiKey: '' });

    assert.deepEqual(
      fs.readdirSync(root).filter(name => name.endsWith('.tmp')),
      [],
    );
  }),
);
