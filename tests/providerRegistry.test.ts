import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ProviderModelOption,
  ProviderPromptOptions,
  ProviderPromptStreamEvent,
  StudyProvider,
} from '../src/infrastructure/providers/contracts.ts';
import { ProviderRegistry } from '../src/infrastructure/providers/registry.ts';

class FakeProvider implements StudyProvider<'fake'> {
  readonly id = 'fake';
  readonly label = 'Fake';
  authSignal: AbortSignal | undefined;
  modelsSignal: AbortSignal | undefined;
  disposed = false;

  async checkAuth(signal?: AbortSignal): Promise<void> {
    this.authSignal = signal;
  }

  async listModels(signal?: AbortSignal): Promise<ProviderModelOption[]> {
    this.modelsSignal = signal;
    return [{ id: 'fake-model', label: 'Fake model', model: 'fake-model', reasoningLevels: [] }];
  }

  async *streamPrompt(input: string, _options: ProviderPromptOptions = {}): AsyncGenerator<ProviderPromptStreamEvent> {
    yield { type: 'response', text: input };
  }

  async dispose(): Promise<void> {
    this.disposed = true;
  }
}

test('ProviderRegistry exposes metadata and creates providers without sharing mutable metadata', async () => {
  const created: FakeProvider[] = [];
  let disposed = 0;
  const registry = new ProviderRegistry<'fake', FakeProvider>([
    {
      metadata: { id: 'fake', label: 'Fake', requiresKey: false },
      create: () => {
        const provider = new FakeProvider();
        created.push(provider);
        return provider;
      },
      dispose: async () => {
        disposed += 1;
      },
    },
  ]);

  const metadata = registry.listMetadata();
  assert.deepEqual(metadata, [{ id: 'fake', label: 'Fake', requiresKey: false }]);
  const firstMetadata = metadata[0];
  assert.ok(firstMetadata);
  firstMetadata.label = 'Changed';
  assert.equal(registry.getMetadata('fake')?.label, 'Fake');
  assert.equal(registry.getMetadata('missing'), null);

  const provider = registry.create('fake');
  assert.ok(provider instanceof FakeProvider);
  assert.equal(created.length, 1);
  assert.equal(registry.create('missing'), null);

  const controller = new AbortController();
  await provider.checkAuth(controller.signal);
  assert.equal(provider.authSignal, controller.signal);
  assert.deepEqual(await provider.listModels(controller.signal), [
    { id: 'fake-model', label: 'Fake model', model: 'fake-model', reasoningLevels: [] },
  ]);
  assert.equal(provider.modelsSignal, controller.signal);

  const events: ProviderPromptStreamEvent[] = [];
  for await (const event of provider.streamPrompt('hello')) events.push(event);
  assert.deepEqual(events, [{ type: 'response', text: 'hello' }]);

  await registry.disposeAll();
  assert.equal(disposed, 1);
});

test('ProviderRegistry rejects duplicate registrations', () => {
  const registration = {
    metadata: { id: 'fake' as const, label: 'Fake', requiresKey: false },
    create: () => new FakeProvider(),
    dispose: async () => {},
  };

  assert.throws(
    () => new ProviderRegistry<'fake', FakeProvider>([registration, registration]),
    /Duplicate provider registration: fake/,
  );
});

test('ProviderRegistry coalesces concurrent disposal and still disposes later registrations after an error', async () => {
  const calls: string[] = [];
  const registry = new ProviderRegistry<'first' | 'second', StudyProvider<'first' | 'second'>>([
    {
      metadata: { id: 'first', label: 'First', requiresKey: false },
      create: () => createMinimalProvider('first'),
      dispose: async () => {
        calls.push('first');
        throw new Error('first failed');
      },
    },
    {
      metadata: { id: 'second', label: 'Second', requiresKey: false },
      create: () => createMinimalProvider('second'),
      dispose: async () => {
        calls.push('second');
      },
    },
  ]);

  const firstDisposal = registry.disposeAll();
  const secondDisposal = registry.disposeAll();
  assert.equal(firstDisposal, secondDisposal);
  await assert.rejects(firstDisposal, /first failed/);
  assert.deepEqual(calls, ['first', 'second']);
});

function createMinimalProvider<TId extends string>(id: TId): StudyProvider<TId> {
  return {
    id,
    label: id,
    checkAuth: async () => {},
    listModels: async () => [],
    streamPrompt: async function* () {},
    dispose: async () => {},
  };
}
