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
  'initialize migrates legacy preferences and sessions without copying credentials into sessions',
  withTemporaryRoot(root => {
    const sessionId = '86e7f39b-bad6-4f5a-a46d-a52b09ea9b95';
    const sessionDirectory = path.join(root, sessionId);
    fs.mkdirSync(sessionDirectory, { recursive: true });
    fs.writeFileSync(path.join(root, 'config.json'), JSON.stringify({ provider: 'codex', apiKey: 'secret' }));
    fs.writeFileSync(
      path.join(root, 'session.json'),
      JSON.stringify({
        provider: 'codex',
        apiKey: 'secret',
        subject: 'Biology',
        modelProvider: 'codex',
        model: 'gpt-test',
        reasoningEffort: 'medium',
        material: '/tmp/cells.pdf',
        studyLanguage: 'English',
        createdDate: '2025-01-01T00:00:00.000Z',
        lastOpenedDate: '2025-01-02T00:00:00.000Z',
      }),
    );
    fs.writeFileSync(
      path.join(sessionDirectory, 'session.json'),
      JSON.stringify({
        sessionId,
        provider: 'codex',
        apiKey: 'secret',
        title: 'Cells',
        summaryText: '## Cell notes',
        subject: 'Biology',
        modelProvider: 'codex',
        model: 'gpt-test',
        reasoningEffort: 'medium',
        material: '/tmp/cells.pdf',
        studyLanguage: 'English',
        createdDate: '2025-01-01T00:00:00.000Z',
        lastOpenedDate: '2025-01-02T00:00:00.000Z',
      }),
    );

    const persistence = createPersistence({ rootDir: root });
    const report = persistence.initialize();

    assert.equal(report.errors.length, 0);
    assert.deepEqual(persistence.readProviderConfig(), { provider: 'codex', apiKey: 'secret' });
    assert.equal(persistence.readAppPreferences()?.preferences.subject, 'Biology');
    assert.equal(persistence.readStudySession(sessionId)?.modeResults.summary, '## Cell notes');

    const storedSession = fs.readFileSync(path.join(sessionDirectory, 'session.json'), 'utf8');
    assert.doesNotMatch(storedSession, /secret/);
    assert.doesNotMatch(storedSession, /apiKey/);

    const secondReport = persistence.initialize();
    assert.equal(secondReport.errors.length, 0);
    assert.equal(secondReport.migrated.length, 0);
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
    persistence.initialize();
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
  'atomic writes leave no temporary files behind',
  withTemporaryRoot(root => {
    const persistence = createPersistence({ rootDir: root });
    persistence.initialize();
    persistence.writeProviderConfig({ provider: 'opencode', apiKey: '' });

    assert.deepEqual(
      fs.readdirSync(root).filter(name => name.endsWith('.tmp')),
      [],
    );
  }),
);
