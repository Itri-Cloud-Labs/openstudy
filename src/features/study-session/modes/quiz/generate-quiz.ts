import type { ResolvedMaterial } from '../../../../infrastructure/materials/index.js';
import type { StudyProvider } from '../../../../providers/index.js';
import { quizSystemPrompt } from '../../../../prompts/quiz.js';
import { parseQuizPayload, type QuizPayload } from './quiz-payload.js';

export const QUIZ_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          choices: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
          correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string' },
        },
        required: ['question', 'choices', 'correctIndex', 'explanation'],
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
  signal?: AbortSignal;
}

export async function generateQuiz(request: GenerateQuizRequest): Promise<QuizPayload> {
  const { text } = await request.provider.prompt(buildQuizUserPrompt(request.studyLanguage), {
    system: quizSystemPrompt,
    model: request.model,
    reasoningEffort: request.reasoningEffort,
    signal: request.signal,
    workingDirectory: request.material.workingDirectory,
    file: request.material.location,
    responseSchema: QUIZ_RESPONSE_SCHEMA,
  });

  const quiz = parseQuizPayload(text);
  if (!quiz) throw new Error('No valid quiz was generated.');
  return quiz;
}

export function buildQuizUserPrompt(language: string): string {
  return [
    'Create a five-question multiple-choice quiz from the attached study material.',
    `Write every question, choice, and explanation in ${language}.`,
    'Each question must have exactly four choices and one unambiguous correct answer.',
    'Keep each choice under 55 characters and each explanation under 180 characters.',
    'Cover the central ideas rather than minor wording or trivia.',
    'Return raw JSON only, with a questions array.',
    'Each question must contain question, choices, correctIndex, and explanation.',
    'correctIndex is zero-based.',
  ].join('\n');
}
