import assert from 'node:assert/strict';
import test from 'node:test';
import { CodexAppServer } from '../src/providers/codex-app-server.ts';
import { withRequestTimeout } from '../src/providers/codex-provider.ts';
import { createProvider, PROVIDER_METADATA } from '../src/providers/index.ts';

test('provider metadata is complete and unique', () => {
  const ids = PROVIDER_METADATA.map(metadata => metadata.id);
  assert.deepEqual([...new Set(ids)], ids);
  assert.deepEqual(ids, ['codex', 'opencode']);

  for (const metadata of PROVIDER_METADATA) {
    assert.equal(typeof metadata.label, 'string');
    assert.equal(typeof metadata.requiresKey, 'boolean');
  }
});

test('createProvider returns a provider matching the requested id', () => {
  for (const metadata of PROVIDER_METADATA) {
    const provider = createProvider(metadata.id);
    assert.ok(provider);
    assert.equal(provider.id, metadata.id);
    assert.equal(provider.label, metadata.label);
  }
});

test('createProvider returns null for unknown ids', () => {
  assert.equal(createProvider('unknown'), null);
});

test('getModels returns isolated copies per instance', () => {
  const [metadata] = PROVIDER_METADATA;
  const first = createProvider(metadata.id);
  const second = createProvider(metadata.id);

  const firstModels = first.getModels();
  firstModels[0]?.reasoningLevels.push({ id: 'mutated', label: 'Mutated', value: 'mutated' });

  assert.deepEqual(second.getModels(), createProvider(metadata.id).getModels());
});

const ECHO_SERVER_SCRIPT = [
  "let b='';",
  "process.stdin.setEncoding('utf8');",
  "process.stdin.on('data', c => {",
  '  b += c;',
  "  let i = b.indexOf('\\n');",
  '  while (i >= 0) {',
  '    const l = b.slice(0, i).trim();',
  '    b = b.slice(i + 1);',
  '    if (l) {',
  '      const m = JSON.parse(l);',
  "      if (m.method === 'ping') {",
  "        process.stdout.write(JSON.stringify({ id: m.id, result: { pong: m.params && m.params.n } }) + '\\n');",
  "      } else if (m.method === 'boom') {",
  "        process.stdout.write(JSON.stringify({ id: m.id, error: { message: 'exploded' } }) + '\\n');",
  "      } else if (m.method === 'emit') {",
  "        process.stdout.write(JSON.stringify({ method: 'tick', params: { n: m.params && m.params.n } }) + '\\n');",
  "        process.stdout.write(JSON.stringify({ id: m.id, result: {} }) + '\\n');",
  '      }',
  '    }',
  "    i = b.indexOf('\\n');",
  '  }',
  '});',
].join('\n');

function spawnEchoServer(): CodexAppServer {
  return CodexAppServer.spawn(process.execPath, ['-e', ECHO_SERVER_SCRIPT]);
}

test('CodexAppServer correlates concurrent request results by id', async () => {
  const server = spawnEchoServer();
  try {
    const [first, second] = await Promise.all([server.request('ping', { n: 1 }), server.request('ping', { n: 2 })]);
    assert.deepEqual(first, { pong: 1 });
    assert.deepEqual(second, { pong: 2 });
  } finally {
    await server.dispose();
  }
});

test('CodexAppServer rejects with the server error message', async () => {
  const server = spawnEchoServer();
  try {
    await assert.rejects(server.request('boom'), /exploded/);
  } finally {
    await server.dispose();
  }
});

test('CodexAppServer dispatches notifications to listeners', async () => {
  const server = spawnEchoServer();
  const received: unknown[] = [];
  const listener = (notification: { method: string; params: unknown }) => {
    if (notification.method === 'tick') received.push(notification.params);
  };
  server.addNotificationListener(listener);
  try {
    await server.request('emit', { n: 7 });
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(received, [{ n: 7 }]);
  } finally {
    server.removeNotificationListener(listener);
    await server.dispose();
  }
});

test('CodexAppServer aborts a pending request and keeps the connection usable', async () => {
  const server = spawnEchoServer();
  const controller = new AbortController();
  try {
    const pending = server.request('ping', { n: 0 }, controller.signal);
    controller.abort(new Error('stop'));
    await assert.rejects(pending, (error: Error) => error.name === 'AbortError');
    await assert.doesNotReject(server.request('ping', { n: 3 }));
  } finally {
    await server.dispose();
  }
});

test('CodexAppServer fails pending requests when the process exits', async () => {
  const server = CodexAppServer.spawn(process.execPath, ['-e', 'setTimeout(() => process.exit(3), 20)']);
  await assert.rejects(server.request('ping', { n: 0 }), /exited unexpectedly \(code 3\)/);
  await server.dispose();
});

test('withRequestTimeout resolves with the wrapped promise value', async () => {
  const value = await withRequestTimeout(Promise.resolve('ok'), 1_000, 'never fires');
  assert.equal(value, 'ok');
});

test('withRequestTimeout rejects with the timeout message', async () => {
  await assert.rejects(
    withRequestTimeout(new Promise<void>(() => undefined), 10, 'timed out waiting'),
    /timed out waiting/,
  );
});
