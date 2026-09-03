import type { ResolvedMaterial } from '../../../../infrastructure/materials/index.js';
import { quizSystemPrompt } from '../../../../prompts/quiz.js';
import type { StudyProvider } from '../../../../providers/index.js';
import { parseQuizPayload, type QuizPayload } from './quiz-payload.js';

export const QUIZ_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          depth: {
            type: 'string',
            enum: ['recognition', 'recall', 'explanation', 'application', 'discrimination', 'transfer', 'synthesis'],
          },
          difficulty: { type: 'string', enum: ['Introductory', 'Intermediate', 'Advanced'] },
          prompt: { type: 'string' },
          explanation: { type: 'string' },
          choices: { type: ['array', 'null'], minItems: 2, maxItems: 4, items: { type: 'string' } },
          correctIndex: { type: ['integer', 'null'], minimum: 0, maximum: 3 },
          expectedAnswer: { type: 'string' },
          gradingPoints: { type: 'array', items: { type: 'string' } },
          hints: { type: 'array', items: { type: 'string' } },
          sourceAnchor: { type: 'string' },
        },
        required: [
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
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const;

export interface GenerateQuizRequest {
  provider: StudyProvider;
  model: string;
  reasoningEffort?: string;
  material: ResolvedMaterial;
  studyLanguage: string;
  previousQuestions?: string[];
  roundIntent?: QuizRoundIntent;
  focusTopics?: string[];
  signal?: AbortSignal;
}

export type QuizRoundIntent = 'adaptive' | 'weak-spots' | 'raise-level' | 'transfer' | 'exam';

export async function generateQuiz(request: GenerateQuizRequest): Promise<QuizPayload> {
  const userPrompt = buildQuizUserPrompt(
    request.studyLanguage,
    request.previousQuestions,
    request.roundIntent,
    request.focusTopics,
  );
  const options = {
    system: quizSystemPrompt,
    model: request.model,
    reasoningEffort: request.reasoningEffort,
    signal: request.signal,
    workingDirectory: request.material.workingDirectory,
    file: request.material.location,
    responseSchema: QUIZ_RESPONSE_SCHEMA,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt =
      attempt === 0
        ? userPrompt
        : `${userPrompt}\n\nYour previous response could not be parsed. Return only one complete JSON object matching the schema.`;
    const { text } = await request.provider.prompt(prompt, options);
    const quiz = parseQuizPayload(text);
    if (quiz) return balanceQuizAnswers(quiz);
  }

  throw new Error('The model returned malformed quiz data twice. Try generating the round again.');
}

export function buildQuizUserPrompt(
  language: string,
  previousQuestions: string[] = [],
  roundIntent: QuizRoundIntent = 'adaptive',
  focusTopics: string[] = [],
): string {
  const lines = [
    'Create a mixed, adaptive question bank from the attached study material.',
    'Choose the number of questions that best covers the meaningful ideas once. Use fewer questions for short or narrow material and more for dense material. Do not add filler to reach a fixed count.',
    'Choose the question depth that best tests each idea: recognition, recall, explanation, application, discrimination, transfer, or synthesis.',
    'Use both formats when the material supports them. Use multiple-choice for recognition or discrimination; use free-recall questions for recall, explanation, application, transfer, or synthesis.',
    `Write every question, choice, and explanation in ${language}.`,
    'For multiple-choice questions, include two to four choices and exactly one unambiguous correct answer. For free-recall questions, set choices and correctIndex to null.',
    'Keep each choice under 55 characters and each explanation under 180 characters.',
    'For every question, include an expectedAnswer, gradingPoints array, hints array, and sourceAnchor. gradingPoints should name the ideas needed for a full-credit response.',
    'Cover the central ideas rather than minor wording or trivia.',
    'Return raw JSON only, with a questions array.',
    'Each question must contain topic, depth, difficulty, prompt, explanation, expectedAnswer, gradingPoints, hints, and sourceAnchor.',
    'choices and correctIndex are required JSON fields. Set both to null for free recall. For multiple choice, correctIndex is zero-based.',
    'difficulty must be Introductory, Intermediate, or Advanced.',
  ];

  const intentInstructions: Record<QuizRoundIntent, string> = {
    adaptive: 'Build a balanced adaptive round across the most important concepts.',
    'weak-spots': `Concentrate on the learner's weak concepts: ${focusTopics.join(', ') || 'the least secure concepts'}. Ask them from new angles.`,
    'raise-level':
      'Raise the depth and difficulty. Prefer explanation, application, discrimination, and transfer over recognition.',
    transfer: 'Create a transfer round. Use unfamiliar situations while staying grounded in the source concepts.',
    exam: 'Create a concise exam simulation. Do not provide giveaway wording; cover the highest-value concepts at realistic difficulty.',
  };
  lines.push('', `Round direction: ${intentInstructions[roundIntent]}`);

  if (previousQuestions.length > 0) {
    lines.push(
      '',
      'This is a new round. Do not repeat these earlier questions:',
      ...previousQuestions.map(item => `- ${item}`),
    );
  }

  return lines.join('\n');
}

export function balanceQuizAnswers(quiz: QuizPayload, random: () => number = Math.random): QuizPayload {
  const multipleChoiceQuestions = quiz.questions.filter(
    question => question.choices !== undefined && question.choices.length > 0 && question.correctIndex !== undefined,
  );
  const positions = new Array<number>(multipleChoiceQuestions.length);
  const questionsByChoiceCount = new Map<number, number[]>();
  multipleChoiceQuestions.forEach((question, index) => {
    const choiceCount = question.choices?.length ?? 0;
    const group = questionsByChoiceCount.get(choiceCount) ?? [];
    group.push(index);
    questionsByChoiceCount.set(choiceCount, group);
  });
  for (const [choiceCount, questionIndexes] of questionsByChoiceCount) {
    const groupPositions = questionIndexes.map((_, index) => index % choiceCount);
    shuffle(groupPositions, random);
    questionIndexes.forEach((questionIndex, index) => {
      positions[questionIndex] = groupPositions[index] ?? 0;
    });
  }
  let multipleChoiceIndex = 0;

  return {
    questions: quiz.questions.map(question => {
      if (!question.choices || question.correctIndex === undefined) return { ...question };

      const targetIndex = positions[multipleChoiceIndex] ?? 0;
      multipleChoiceIndex += 1;
      if (targetIndex === question.correctIndex) return { ...question, choices: [...question.choices] };

      const choices = [...question.choices];
      [choices[targetIndex], choices[question.correctIndex]] = [
        choices[question.correctIndex] ?? '',
        choices[targetIndex] ?? '',
      ];
      return { ...question, choices, correctIndex: targetIndex };
    }),
  };
}

function shuffle(values: number[], random: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target] ?? 0, values[index] ?? 0];
  }
}
