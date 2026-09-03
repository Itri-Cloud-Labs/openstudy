import assert from 'node:assert/strict';
import test from 'node:test';
import {
  type AnswerEvidenceInput,
  createLearnerEvidence,
  getConceptState,
  getRoundStatus,
  type LearnerEvidence,
  recommendNextAction,
  recordAnswer,
} from '../src/features/study-session/modes/quiz/quiz-engine.ts';

function answer(overrides: Partial<AnswerEvidenceInput> = {}): AnswerEvidenceInput {
  return {
    conceptId: 'fractions',
    correct: true,
    confidence: 'certain',
    hintCount: 0,
    depth: 'recall',
    ...overrides,
  };
}

function recordMany(initial: LearnerEvidence, ...answers: AnswerEvidenceInput[]): LearnerEvidence {
  return answers.reduce(recordAnswer, initial);
}

test('records answer evidence immutably and aggregates each signal', () => {
  const initial = createLearnerEvidence(['fractions']);
  const next = recordAnswer(
    initial,
    answer({
      correct: false,
      confidence: 'unsure',
      hintCount: 2,
      depth: 'application',
      errorClassification: 'knowledge-gap',
    }),
  );

  assert.equal(initial.concepts.fractions?.attempts, 0);
  assert.deepEqual(next.concepts.fractions, {
    conceptId: 'fractions',
    attempts: 1,
    correct: 0,
    incorrect: 1,
    certainIncorrect: 0,
    hints: 2,
    confidence: { unsure: 1, 'think-so': 0, certain: 0 },
    depths: { application: 1 },
    errors: { 'knowledge-gap': 1 },
    lastAnswer: {
      correct: false,
      confidence: 'unsure',
      hintCount: 2,
      depth: 'application',
      errorClassification: 'knowledge-gap',
    },
  });
});

test('classifies an untested concept and a clean demonstrated concept', () => {
  const initial = createLearnerEvidence(['fractions']);
  assert.equal(getConceptState(initial, 'fractions'), 'untested');

  const secure = recordMany(initial, answer(), answer({ depth: 'application' }));
  assert.equal(getConceptState(secure, 'fractions'), 'secure');
});

test('classifies explicit misconceptions before generic fragile evidence', () => {
  const evidence = recordAnswer(
    createLearnerEvidence(),
    answer({ correct: false, confidence: 'certain', errorClassification: 'misconception' }),
  );
  assert.equal(getConceptState(evidence, 'fractions'), 'misunderstood');
  assert.equal(recommendNextAction(evidence, ['fractions']).action, 'repair-misconception');
});

test('recommends the weakest concept deterministically', () => {
  const evidence = recordMany(
    createLearnerEvidence(['secure', 'weak', 'new']),
    answer({ conceptId: 'secure' }),
    answer({ conceptId: 'secure', depth: 'application' }),
    answer({ conceptId: 'weak', correct: false, confidence: 'think-so' }),
  );

  assert.deepEqual(recommendNextAction(evidence, ['new', 'weak', 'secure']), {
    action: 'review-and-retest',
    conceptId: 'weak',
    state: 'fragile',
    reason: 'A miss or hint shows that this concept is not reliable without support.',
  });
});

test('round completion requires secure evidence for every requested concept', () => {
  const initial = createLearnerEvidence(['a', 'b']);
  const partial = recordMany(initial, answer({ conceptId: 'a' }), answer({ conceptId: 'a', depth: 'application' }));
  assert.deepEqual(getRoundStatus(partial, ['a', 'b']), {
    complete: false,
    conceptIds: ['a', 'b'],
    secureConceptIds: ['a'],
    remainingConceptIds: ['b'],
    nextConceptId: 'b',
  });

  const complete = recordMany(partial, answer({ conceptId: 'b' }), answer({ conceptId: 'b', depth: 'application' }));
  assert.equal(getRoundStatus(complete, ['a', 'b']).complete, true);
  assert.equal(recommendNextAction(complete, ['a', 'b']).action, 'complete');
});

test('correct answers never retain a supplied error classification', () => {
  const evidence = recordAnswer(createLearnerEvidence(), answer({ errorClassification: 'misconception' }));
  assert.deepEqual(evidence.concepts.fractions?.errors, { none: 1 });
});
