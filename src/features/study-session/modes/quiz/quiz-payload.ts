export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizPayload {
  questions: QuizQuestion[];
}

export function parseQuizPayload(response: string): QuizPayload | null {
  let normalized = response.trim();
  if (!normalized) return null;

  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/u.exec(normalized);
  if (fenceMatch?.[1]) normalized = fenceMatch[1].trim();

  try {
    return normalizeQuizPayload(JSON.parse(normalized));
  } catch {
    return null;
  }
}

export function normalizeQuizPayload(value: unknown): QuizPayload | null {
  if (typeof value !== 'object' || value === null || !('questions' in value) || !Array.isArray(value.questions)) {
    return null;
  }

  const questions = value.questions.map(normalizeQuestion);
  if (questions.length === 0 || questions.some(question => question === null)) return null;
  return { questions: questions as QuizQuestion[] };
}

function normalizeQuestion(value: unknown): QuizQuestion | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('question' in value) || typeof value.question !== 'string' || !value.question.trim()) return null;
  if (!('choices' in value) || !Array.isArray(value.choices)) return null;
  if (!('correctIndex' in value) || !Number.isInteger(value.correctIndex)) return null;
  if (!('explanation' in value) || typeof value.explanation !== 'string' || !value.explanation.trim()) return null;

  const choices = value.choices.filter(choice => typeof choice === 'string' && choice.trim().length > 0);
  const correctIndex = value.correctIndex as number;
  if (
    choices.length < 2 ||
    choices.length !== value.choices.length ||
    new Set(choices).size !== choices.length ||
    correctIndex < 0 ||
    correctIndex >= choices.length
  ) {
    return null;
  }

  return {
    question: value.question.trim(),
    choices: choices.map(choice => choice.trim()),
    correctIndex,
    explanation: value.explanation.trim(),
  };
}
