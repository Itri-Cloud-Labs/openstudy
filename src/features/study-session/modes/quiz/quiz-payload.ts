export const QUIZ_DEPTHS = [
  'recognition',
  'recall',
  'explanation',
  'application',
  'discrimination',
  'transfer',
  'synthesis',
] as const;

export type QuizDepth = (typeof QUIZ_DEPTHS)[number];

/**
 * A question is multiple-choice when both choices and correctIndex are present.
 * Free-recall questions intentionally leave those fields out.
 *
 * `question` is retained as a compatibility alias for quizzes saved before the
 * payload was renamed to use `prompt`.
 */
export interface QuizQuestion {
  topic: string;
  depth?: QuizDepth;
  difficulty: string;
  prompt?: string;
  question: string;
  explanation: string;
  choices?: string[];
  correctIndex?: number;
  expectedAnswer?: string;
  gradingPoints?: string[];
  hints?: string[];
  sourceAnchor?: string;
}

export interface QuizPayload {
  questions: QuizQuestion[];
}

export function parseQuizPayload(response: string): QuizPayload | null {
  let normalized = response.trim();
  if (!normalized) return null;

  const fenceMatch = /```(?:json)?\s*([\s\S]*?)\s*```/u.exec(normalized);
  if (fenceMatch?.[1]) normalized = fenceMatch[1].trim();

  for (const candidate of jsonCandidates(normalized)) {
    try {
      const quiz = normalizeQuizPayload(JSON.parse(candidate));
      if (quiz) return quiz;
    } catch {
      // Try the next bounded JSON candidate.
    }
  }
  return null;
}

export function normalizeQuizPayload(value: unknown): QuizPayload | null {
  if (!isRecord(value) || !Array.isArray(value.questions)) return null;

  const questions = value.questions
    .map(normalizeQuestion)
    .filter((question): question is QuizQuestion => question !== null);
  return questions.length > 0 ? { questions } : null;
}

function jsonCandidates(value: string): string[] {
  const candidates = [value];
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(value.slice(start, end + 1));
  return [...new Set(candidates)];
}

function normalizeQuestion(value: unknown): QuizQuestion | null {
  if (!isRecord(value)) return null;

  const rawPrompt = readNonEmptyString(value.prompt) ?? readNonEmptyString(value.question);
  if (!rawPrompt) return null;

  const hasChoices = value.choices !== undefined && value.choices !== null;
  const hasCorrectIndex = value.correctIndex !== undefined && value.correctIndex !== null;
  const choices = hasChoices ? normalizeStringArray(value.choices) : null;

  // A question cannot be half multiple-choice. This also prevents a malformed
  // free-recall item from being treated as an MCQ by answer balancing.
  if ((hasChoices && choices === null) || hasChoices !== hasCorrectIndex) {
    return null;
  }

  let correctIndex: number | undefined;
  if (hasCorrectIndex) {
    if (!Number.isInteger(value.correctIndex)) return null;
    correctIndex = value.correctIndex as number;
    if (!choices || choices.length < 2 || correctIndex < 0 || correctIndex >= choices.length) return null;
    if (new Set(choices).size !== choices.length) return null;
  } else if (choices) {
    return null;
  }

  const explanation = readNonEmptyString(value.explanation);
  if (!explanation) return null;

  const depth = normalizeDepth(value.depth);
  if ('depth' in value && depth === null) return null;

  const expectedAnswer = readNonEmptyString(value.expectedAnswer);
  if ('expectedAnswer' in value && value.expectedAnswer !== undefined && expectedAnswer === null) return null;

  const gradingPoints = normalizeStringArray(value.gradingPoints);
  if ('gradingPoints' in value && gradingPoints === null) return null;

  const hints = normalizeStringArray(value.hints);
  if ('hints' in value && hints === null) return null;

  const sourceAnchor = readNonEmptyString(value.sourceAnchor);
  if ('sourceAnchor' in value && value.sourceAnchor !== undefined && sourceAnchor === null) return null;

  const topic = readNonEmptyString(value.topic) ?? 'Core concept';
  const difficulty = readNonEmptyString(value.difficulty) ?? 'Mixed';

  // Keep old stored MCQs byte-for-byte compatible at the object-shape level:
  // callers can still render `question`, while newly generated questions get
  // the richer fields below.
  const isLegacyQuestion =
    !('prompt' in value) &&
    !('depth' in value) &&
    !('expectedAnswer' in value) &&
    !('gradingPoints' in value) &&
    !('hints' in value) &&
    !('sourceAnchor' in value);
  if (isLegacyQuestion) {
    if (!choices || correctIndex === undefined) return null;
    return {
      topic,
      difficulty,
      question: rawPrompt,
      choices,
      correctIndex,
      explanation,
    };
  }

  // Free recall needs an answer target to grade against. MCQs can derive one
  // from the selected choice, which keeps the field useful to newer consumers
  // even when a provider omits it.
  const resolvedExpectedAnswer =
    expectedAnswer ?? (choices && correctIndex !== undefined ? choices[correctIndex] : null);
  if (!resolvedExpectedAnswer) return null;

  return {
    topic,
    depth: depth ?? (choices ? 'recognition' : 'recall'),
    difficulty,
    prompt: rawPrompt,
    question: rawPrompt,
    explanation,
    ...(choices ? { choices } : {}),
    ...(correctIndex !== undefined ? { correctIndex } : {}),
    expectedAnswer: resolvedExpectedAnswer,
    gradingPoints: gradingPoints ?? [],
    hints: hints ?? [],
    ...(sourceAnchor ? { sourceAnchor } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeDepth(value: unknown): QuizDepth | null {
  if (value === undefined) return null;
  return typeof value === 'string' && (QUIZ_DEPTHS as readonly string[]).includes(value) ? (value as QuizDepth) : null;
}

function normalizeStringArray(value: unknown): string[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return null;

  const normalized = value.map(item => readNonEmptyString(item));
  if (normalized.some(item => item === null)) return null;
  return normalized as string[];
}
