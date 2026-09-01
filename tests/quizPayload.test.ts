import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeQuizPayload, parseQuizPayload } from '../src/features/study-session/modes/quiz/quiz-payload.ts';

const validQuiz = {
  questions: [
    {
      question: 'What carries genetic information?',
      choices: ['DNA', 'Water', 'Glucose', 'Calcium'],
      correctIndex: 0,
      explanation: 'DNA stores hereditary information.',
    },
  ],
};

test('parseQuizPayload reads a complete quiz', () => {
  assert.deepEqual(parseQuizPayload(JSON.stringify(validQuiz)), validQuiz);
});

test('parseQuizPayload strips JSON fences', () => {
  assert.deepEqual(parseQuizPayload(`\`\`\`json\n${JSON.stringify(validQuiz)}\n\`\`\``), validQuiz);
});

test('normalizeQuizPayload rejects an out-of-range correct answer', () => {
  assert.equal(
    normalizeQuizPayload({
      questions: [{ ...validQuiz.questions[0], correctIndex: 4 }],
    }),
    null,
  );
});

test('normalizeQuizPayload rejects incomplete questions', () => {
  assert.equal(normalizeQuizPayload({ questions: [{ question: 'Missing choices' }] }), null);
});
