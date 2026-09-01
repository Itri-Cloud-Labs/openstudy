import type { ResolvedMaterial } from '../../../../infrastructure/materials/index.js';
import type { StudyProvider } from '../../../../providers/index.js';
import { quizSystemPrompt } from '../../../../prompts/quiz.js';
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
          difficulty: { type: 'string', enum: ['Introductory', 'Intermediate', 'Advanced'] },
          question: { type: 'string' },
          choices: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
          correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string' },
        },
        required: ['topic', 'difficulty', 'question', 'choices', 'correctIndex', 'explanation'],
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
  signal?: AbortSignal;
}

export async function generateQuiz(request: GenerateQuizRequest): Promise<QuizPayload> {
  const { text } = await request.provider.prompt(
    buildQuizUserPrompt(request.studyLanguage, request.previousQuestions),
    {
      system: quizSystemPrompt,
      model: request.model,
      reasoningEffort: request.reasoningEffort,
      signal: request.signal,
      workingDirectory: request.material.workingDirectory,
      file: request.material.location,
      responseSchema: QUIZ_RESPONSE_SCHEMA,
    },
  );

  const quiz = parseQuizPayload(text);
  if (!quiz) throw new Error('No valid quiz was generated.');
  return balanceQuizAnswers(quiz);
}

export function buildQuizUserPrompt(language: string, previousQuestions: string[] = []): string {
  const lines = [
    'Create a multiple-choice quiz from the attached study material.',
    'Choose the number of questions that best covers the meaningful ideas once. Use fewer questions for short or narrow material and more for dense material. Do not add filler to reach a fixed count.',
    `Write every question, choice, and explanation in ${language}.`,
    'Each question must have exactly four choices and one unambiguous correct answer.',
    'Keep each choice under 55 characters and each explanation under 180 characters.',
    'Cover the central ideas rather than minor wording or trivia.',
    'Return raw JSON only, with a questions array.',
    'Each question must contain topic, difficulty, question, choices, correctIndex, and explanation.',
    'difficulty must be Introductory, Intermediate, or Advanced.',
    'correctIndex is zero-based.',
  ];

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
  const positions = quiz.questions.map((question, index) => index % question.choices.length);
  shuffle(positions, random);

  return {
    questions: quiz.questions.map((question, index) => {
      const targetIndex = positions[index] ?? 0;
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
