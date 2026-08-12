import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSummaryPayload } from '../src/session/summaryPayload.ts';

test('parseSummaryPayload reads complete JSON', () => {
  assert.deepEqual(parseSummaryPayload('{"SessionTitle":"Cells","content":"## Notes"}'), {
    SessionTitle: 'Cells',
    content: '## Notes',
  });
});

test('parseSummaryPayload strips JSON fences', () => {
  assert.deepEqual(parseSummaryPayload('```json\n{"SessionTitle":"Math","content":"Algebra"}\n```'), {
    SessionTitle: 'Math',
    content: 'Algebra',
  });
});

test('parseSummaryPayload tolerates partial streamed strings', () => {
  assert.deepEqual(parseSummaryPayload('{"SessionTitle":"Bio","content":"Line one\\nLine two'), {
    SessionTitle: 'Bio',
    content: 'Line one\nLine two',
  });
});

test('parseSummaryPayload rejects unrelated JSON', () => {
  assert.equal(parseSummaryPayload('{"title":"Nope"}'), null);
});
