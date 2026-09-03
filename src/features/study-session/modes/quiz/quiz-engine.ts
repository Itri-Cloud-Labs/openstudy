import { QUIZ_DEPTHS, type QuizDepth } from './quiz-payload.js';

/**
 * Pure evidence tracking for adaptive quiz rounds.
 *
 * This module deliberately does not know about providers or UI. A quiz
 * renderer can turn its answer events into AnswerEvidenceInput values and use
 * the returned store to decide what to ask next.
 */

export type QuestionDepth = QuizDepth;

export const CONFIDENCES = ['unsure', 'think-so', 'certain'] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export const ERROR_CLASSIFICATIONS = [
  'none',
  'knowledge-gap',
  'misconception',
  'reasoning',
  'careless',
  'transfer',
  'unknown',
] as const;
export type ErrorClassification = (typeof ERROR_CLASSIFICATIONS)[number];

export type ConceptState = 'secure' | 'developing' | 'fragile' | 'misunderstood' | 'untested';

export type NextAction =
  | 'introduce'
  | 'repair-misconception'
  | 'review-and-retest'
  | 'practice-recall'
  | 'increase-depth'
  | 'challenge-transfer'
  | 'maintain'
  | 'complete';

export interface AnswerEvidenceInput {
  conceptId: string;
  correct: boolean;
  confidence: Confidence;
  hintCount: number;
  depth: QuestionDepth;
  errorClassification?: ErrorClassification;
}

export interface AnswerSnapshot {
  correct: boolean;
  confidence: Confidence;
  hintCount: number;
  depth: QuestionDepth;
  errorClassification: ErrorClassification;
}

export interface ConceptEvidence {
  conceptId: string;
  attempts: number;
  correct: number;
  incorrect: number;
  certainIncorrect: number;
  hints: number;
  confidence: Record<Confidence, number>;
  depths: Partial<Record<QuestionDepth, number>>;
  errors: Partial<Record<ErrorClassification, number>>;
  lastAnswer?: AnswerSnapshot;
}

export interface LearnerEvidence {
  concepts: Record<string, ConceptEvidence>;
}

export interface NextActionRecommendation {
  action: NextAction;
  conceptId?: string;
  state?: ConceptState;
  reason: string;
}

export interface RoundStatus {
  complete: boolean;
  conceptIds: string[];
  secureConceptIds: string[];
  remainingConceptIds: string[];
  nextConceptId?: string;
}

const DEPTH_RANK: Record<QuestionDepth, number> = {
  recognition: 1,
  recall: 2,
  explanation: 3,
  application: 4,
  discrimination: 5,
  transfer: 6,
  synthesis: 7,
};

const STATE_PRIORITY: Record<ConceptState, number> = {
  misunderstood: 0,
  fragile: 1,
  developing: 2,
  untested: 3,
  secure: 4,
};

export function createLearnerEvidence(conceptIds: readonly string[] = []): LearnerEvidence {
  const concepts: Record<string, ConceptEvidence> = {};
  for (const conceptId of conceptIds) {
    if (conceptId.trim()) concepts[conceptId] = createConceptEvidence(conceptId);
  }
  return { concepts };
}

export function recordAnswer(store: LearnerEvidence, answer: AnswerEvidenceInput): LearnerEvidence {
  validateAnswer(answer);

  const previous = store.concepts[answer.conceptId] ?? createConceptEvidence(answer.conceptId);
  const errorClassification = answer.correct ? 'none' : (answer.errorClassification ?? 'unknown');
  const next: ConceptEvidence = {
    ...previous,
    attempts: previous.attempts + 1,
    correct: previous.correct + (answer.correct ? 1 : 0),
    incorrect: previous.incorrect + (answer.correct ? 0 : 1),
    certainIncorrect: previous.certainIncorrect + (!answer.correct && answer.confidence === 'certain' ? 1 : 0),
    hints: previous.hints + answer.hintCount,
    confidence: {
      ...previous.confidence,
      [answer.confidence]: previous.confidence[answer.confidence] + 1,
    },
    depths: increment(previous.depths, answer.depth),
    errors: increment(previous.errors, errorClassification),
    lastAnswer: {
      correct: answer.correct,
      confidence: answer.confidence,
      hintCount: answer.hintCount,
      depth: answer.depth,
      errorClassification,
    },
  };

  return {
    concepts: {
      ...store.concepts,
      [answer.conceptId]: next,
    },
  };
}

export function getConceptState(store: LearnerEvidence, conceptId: string): ConceptState {
  const evidence = store.concepts[conceptId];
  if (!evidence || evidence.attempts === 0) return 'untested';

  const accuracy = evidence.correct / evidence.attempts;
  const hasMisconception = (evidence.errors.misconception ?? 0) > 0;

  // An explicitly identified misconception takes precedence over aggregate
  // accuracy: it needs repair before more difficult questions are useful.
  if (hasMisconception || (evidence.incorrect >= 2 && evidence.certainIncorrect >= 2 && accuracy < 0.5)) {
    return 'misunderstood';
  }

  const maxDepth = highestDepth(evidence);
  const isSecure =
    evidence.attempts >= 2 &&
    evidence.correct >= 2 &&
    evidence.incorrect === 0 &&
    evidence.hints === 0 &&
    evidence.confidence.certain > 0 &&
    maxDepth >= DEPTH_RANK.recall &&
    evidence.lastAnswer?.correct === true;

  if (isSecure) return 'secure';

  // Any observed miss or assistance makes a concept fragile until it has been
  // repaired and demonstrated again. One clean, low-confidence attempt stays
  // developing rather than being over-penalized.
  if (evidence.incorrect > 0 || evidence.hints > 0) return 'fragile';
  return 'developing';
}

export function recommendNextAction(
  store: LearnerEvidence,
  conceptIds: readonly string[] = Object.keys(store.concepts),
): NextActionRecommendation {
  const ids = uniqueConceptIds(conceptIds);
  const nextConceptId = ids
    .filter(conceptId => getConceptState(store, conceptId) !== 'secure')
    .sort((left, right) => {
      const stateDifference =
        STATE_PRIORITY[getConceptState(store, left)] - STATE_PRIORITY[getConceptState(store, right)];
      return stateDifference || left.localeCompare(right);
    })[0];

  if (!nextConceptId) {
    return {
      action: ids.length > 0 ? 'complete' : 'introduce',
      reason: ids.length > 0 ? 'Every concept has secure evidence.' : 'No concepts have been introduced yet.',
    };
  }

  const state = getConceptState(store, nextConceptId);
  const evidence = store.concepts[nextConceptId];
  if (state === 'untested') {
    return { action: 'introduce', conceptId: nextConceptId, state, reason: 'This concept has no answer evidence yet.' };
  }
  if (state === 'misunderstood') {
    return {
      action: 'repair-misconception',
      conceptId: nextConceptId,
      state,
      reason: 'A misconception or repeated high-confidence error needs an explanation and a fresh check.',
    };
  }
  if (state === 'fragile') {
    return {
      action: 'review-and-retest',
      conceptId: nextConceptId,
      state,
      reason: 'A miss or hint shows that this concept is not reliable without support.',
    };
  }

  const maxDepth = highestDepth(evidence);
  if (maxDepth < DEPTH_RANK.application) {
    return {
      action: 'practice-recall',
      conceptId: nextConceptId,
      state,
      reason: 'Build a clean retrieval trace before increasing question depth.',
    };
  }
  return {
    action: 'increase-depth',
    conceptId: nextConceptId,
    state,
    reason: 'Correct evidence is present; test whether it transfers beyond the current pattern.',
  };
}

export function getRoundStatus(store: LearnerEvidence, conceptIds: readonly string[]): RoundStatus {
  const ids = uniqueConceptIds(conceptIds);
  const secureConceptIds = ids.filter(conceptId => getConceptState(store, conceptId) === 'secure');
  const remainingConceptIds = ids.filter(conceptId => !secureConceptIds.includes(conceptId));
  const recommendation = recommendNextAction(store, ids);

  return {
    complete: ids.length > 0 && remainingConceptIds.length === 0,
    conceptIds: ids,
    secureConceptIds,
    remainingConceptIds,
    nextConceptId: recommendation.conceptId,
  };
}

function createConceptEvidence(conceptId: string): ConceptEvidence {
  return {
    conceptId,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    certainIncorrect: 0,
    hints: 0,
    confidence: { unsure: 0, 'think-so': 0, certain: 0 },
    depths: {},
    errors: {},
  };
}

function increment<Key extends string>(counts: Partial<Record<Key, number>>, key: Key): Partial<Record<Key, number>> {
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}

function highestDepth(evidence: ConceptEvidence): number {
  return Object.entries(evidence.depths).reduce((highest, [depth, count]) => {
    if (!count) return highest;
    return Math.max(highest, DEPTH_RANK[depth as QuestionDepth] ?? 0);
  }, 0);
}

function uniqueConceptIds(conceptIds: readonly string[]): string[] {
  return [...new Set(conceptIds.filter(conceptId => conceptId.trim()))];
}

function validateAnswer(answer: AnswerEvidenceInput): void {
  if (!answer.conceptId.trim()) throw new Error('Answer evidence requires a conceptId.');
  if (!CONFIDENCES.includes(answer.confidence)) throw new Error(`Unknown confidence: ${answer.confidence}`);
  if (!QUIZ_DEPTHS.includes(answer.depth)) throw new Error(`Unknown question depth: ${answer.depth}`);
  if (!Number.isInteger(answer.hintCount) || answer.hintCount < 0) {
    throw new Error('Answer evidence hintCount must be a non-negative integer.');
  }
  if (answer.errorClassification && !ERROR_CLASSIFICATIONS.includes(answer.errorClassification)) {
    throw new Error(`Unknown error classification: ${answer.errorClassification}`);
  }
}
