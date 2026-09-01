import assert from 'node:assert/strict';
import test from 'node:test';
import { balanceQuizAnswers, buildQuizUserPrompt } from '../src/features/study-session/modes/quiz/generate-quiz.ts';
import { normalizeQuizPayload, parseQuizPayload } from '../src/features/study-session/modes/quiz/quiz-payload.ts';

const validQuiz = {
  questions: [
    {
      topic: 'Genetics',
      difficulty: 'Introductory',
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

test('balanceQuizAnswers spreads correct answers across positions', () => {
  const quiz = {
    questions: Array.from({ length: 8 }, (_, index) => ({
      topic: `Topic ${index}`,
      difficulty: 'Intermediate',
      question: `Question ${index}`,
      choices: [`correct-${index}`, `wrong-a-${index}`, `wrong-b-${index}`, `wrong-c-${index}`],
      correctIndex: 0,
      explanation: `Explanation ${index}`,
    })),
  };

  const balanced = balanceQuizAnswers(quiz, () => 0.5);
  const positions = balanced.questions.map(question => question.correctIndex);
  assert.deepEqual(
    positions.map(position => positions.filter(item => item === position).length),
    Array(8).fill(2),
  );
  balanced.questions.forEach((question, index) => {
    assert.equal(question.choices[question.correctIndex], `correct-${index}`);
  });
});

test('buildQuizUserPrompt lets the model size the quiz and excludes earlier questions', () => {
  const prompt = buildQuizUserPrompt('English', ['An earlier question?']);
  assert.doesNotMatch(prompt, /five-question/iu);
  assert.match(prompt, /Choose the number of questions/iu);
  assert.match(prompt, /An earlier question\?/u);
});
