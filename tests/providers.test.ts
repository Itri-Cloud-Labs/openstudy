import assert from 'node:assert/strict';
import test from 'node:test';
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
