import assert from 'node:assert/strict';
import test from 'node:test';
import {
  balanceQuizAnswers,
  buildQuizUserPrompt,
  generateQuiz,
  QUIZ_RESPONSE_SCHEMA,
} from '../src/features/study-session/modes/quiz/generate-quiz.ts';
import { normalizeQuizPayload, parseQuizPayload } from '../src/features/study-session/modes/quiz/quiz-payload.ts';
import type { StudyProvider } from '../src/providers/index.ts';

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

test('parseQuizPayload extracts JSON when a provider adds a short preface', () => {
  const response = `Here is the quiz:\n\n\`\`\`json\n${JSON.stringify(validQuiz)}\n\`\`\``;
  assert.deepEqual(parseQuizPayload(response), validQuiz);
});

test('normalizeQuizPayload preserves the shape of legacy stored multiple-choice quizzes', () => {
  assert.deepEqual(normalizeQuizPayload(validQuiz), validQuiz);
});

test('normalizeQuizPayload supports a free-recall question', () => {
  assert.deepEqual(
    normalizeQuizPayload({
      questions: [
        {
          topic: 'Genetics',
          depth: 'recall',
          difficulty: 'Intermediate',
          prompt: 'What molecule stores hereditary information?',
          explanation: 'DNA stores hereditary information in its sequence.',
          expectedAnswer: 'DNA',
          gradingPoints: ['Names DNA', 'Connects DNA to hereditary information'],
          hints: ['Think of the molecule copied during cell division.'],
          sourceAnchor: 'Genetics > Hereditary information',
        },
      ],
    }),
    {
      questions: [
        {
          topic: 'Genetics',
          depth: 'recall',
          difficulty: 'Intermediate',
          prompt: 'What molecule stores hereditary information?',
          question: 'What molecule stores hereditary information?',
          explanation: 'DNA stores hereditary information in its sequence.',
          expectedAnswer: 'DNA',
          gradingPoints: ['Names DNA', 'Connects DNA to hereditary information'],
          hints: ['Think of the molecule copied during cell division.'],
          sourceAnchor: 'Genetics > Hereditary information',
        },
      ],
    },
  );
});

test('normalizeQuizPayload accepts nullable choice fields from strict structured output', () => {
  const quiz = normalizeQuizPayload({
    questions: [
      {
        topic: 'Genetics',
        depth: 'recall',
        difficulty: 'Intermediate',
        prompt: 'What stores inherited information?',
        explanation: 'DNA carries inherited information.',
        choices: null,
        correctIndex: null,
        expectedAnswer: 'DNA',
        gradingPoints: ['DNA'],
        hints: ['Think of the molecule.'],
        sourceAnchor: 'Genetics',
      },
    ],
  });

  assert.ok(quiz);
  assert.equal(quiz.questions[0]?.choices, undefined);
  assert.equal(quiz.questions[0]?.correctIndex, undefined);
});

test('normalizeQuizPayload accepts prompt-based multiple-choice questions', () => {
  const normalized = normalizeQuizPayload({
    questions: [
      {
        topic: 'Genetics',
        depth: 'recognition',
        difficulty: 'Introductory',
        prompt: 'What carries genetic information?',
        choices: ['DNA', 'Water', 'Glucose', 'Calcium'],
        correctIndex: 0,
        explanation: 'DNA stores hereditary information.',
        expectedAnswer: 'DNA',
        gradingPoints: ['Identifies DNA'],
        hints: [],
        sourceAnchor: 'Genetics',
      },
    ],
  });

  assert.equal(normalized?.questions[0]?.prompt, 'What carries genetic information?');
  assert.equal(normalized?.questions[0]?.question, 'What carries genetic information?');
  assert.deepEqual(normalized?.questions[0]?.choices, ['DNA', 'Water', 'Glucose', 'Calcium']);
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

test('normalizeQuizPayload keeps valid questions when one generated item is malformed', () => {
  const quiz = normalizeQuizPayload({ questions: [validQuiz.questions[0], { topic: 'Broken' }] });
  assert.deepEqual(quiz, { questions: [validQuiz.questions[0]] });
});

test('normalizeQuizPayload rejects a question with only one MCQ field', () => {
  assert.equal(
    normalizeQuizPayload({
      questions: [
        {
          prompt: 'Which is correct?',
          choices: ['A', 'B'],
          explanation: 'The first choice is correct.',
          expectedAnswer: 'A',
        },
      ],
    }),
    null,
  );
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
    assert.ok(question.choices);
    const correctIndex = question.correctIndex;
    assert.equal(typeof correctIndex, 'number');
    assert.equal(question.choices[correctIndex as number], `correct-${index}`);
  });
});

test('balanceQuizAnswers balances only multiple-choice questions', () => {
  const quiz = normalizeQuizPayload({
    questions: [
      { ...validQuiz.questions[0], question: 'MCQ 1' },
      {
        topic: 'Genetics',
        depth: 'recall',
        difficulty: 'Intermediate',
        prompt: 'Recall something',
        explanation: 'A recall explanation.',
        expectedAnswer: 'DNA',
      },
      {
        ...validQuiz.questions[0],
        question: 'MCQ 2',
        correctIndex: 0,
      },
    ],
  });
  assert.ok(quiz);

  const balanced = balanceQuizAnswers(quiz, () => 0.5);
  assert.equal(balanced.questions[1]?.choices, undefined);
  assert.equal(balanced.questions[1]?.correctIndex, undefined);
  const first = balanced.questions[0];
  const second = balanced.questions[2];
  assert.ok(first?.choices);
  assert.ok(second?.choices);
  assert.equal(first.choices[first.correctIndex ?? -1], 'DNA');
  assert.equal(second.choices[second.correctIndex ?? -1], 'DNA');
});

test('buildQuizUserPrompt lets the model size the quiz and excludes earlier questions', () => {
  const prompt = buildQuizUserPrompt('English', ['An earlier question?']);
  assert.doesNotMatch(prompt, /five-question/iu);
  assert.match(prompt, /Choose the number of questions/iu);
  assert.match(prompt, /An earlier question\?/u);
  assert.match(prompt, /free-recall/iu);
});

test('buildQuizUserPrompt turns debrief choices into distinct round directions', () => {
  assert.match(buildQuizUserPrompt('English', [], 'weak-spots', ['Cell division']), /Cell division/u);
  assert.match(buildQuizUserPrompt('English', [], 'raise-level'), /Raise the depth/iu);
  assert.match(buildQuizUserPrompt('English', [], 'transfer'), /unfamiliar situations/iu);
  assert.match(buildQuizUserPrompt('English', [], 'exam'), /exam simulation/iu);
});

test('QUIZ_RESPONSE_SCHEMA is strict and includes adaptive question fields', () => {
  const questionSchema = QUIZ_RESPONSE_SCHEMA.properties.questions.items;
  assert.equal(questionSchema.additionalProperties, false);
  assert.deepEqual(questionSchema.required, [
    'topic',
    'depth',
    'difficulty',
    'prompt',
    'explanation',
    'choices',
    'correctIndex',
    'expectedAnswer',
    'gradingPoints',
    'hints',
    'sourceAnchor',
  ]);
  assert.ok('choices' in questionSchema.properties);
  assert.ok('correctIndex' in questionSchema.properties);
  assert.ok('gradingPoints' in questionSchema.properties);
  assert.ok('sourceAnchor' in questionSchema.properties);
  assert.deepEqual(new Set(questionSchema.required), new Set(Object.keys(questionSchema.properties)));
});

test('generateQuiz retries one malformed provider response', async () => {
  const responses = ['not json', JSON.stringify(validQuiz)];
  const prompts: string[] = [];
  const provider: StudyProvider = {
    id: 'codex',
    label: 'Test',
    checkAuth: async () => undefined,
    getModels: () => [],
    prompt: async input => {
      prompts.push(input);
      return { text: responses.shift() ?? '' };
    },
    dispose: async () => undefined,
  };

  const quiz = await generateQuiz({
    provider,
    model: 'test',
    material: { location: '/tmp/material.txt' },
    studyLanguage: 'English',
  });

  assert.equal(quiz.questions.length, 1);
  assert.equal(prompts.length, 2);
  assert.match(prompts[1] ?? '', /previous response could not be parsed/iu);
});
