import { TextAttributes } from '@opentui/core';
import React from 'react';
import { useAppKeys } from '../../../../shared/terminal/keymap.js';
import { truncate } from '../../../../shared/text.js';
import { THEME } from '../../../../shared/theme.js';
import type { ModeProps } from '../summary/SummaryMode.js';
import { type Confidence, createLearnerEvidence, getConceptState, recordAnswer } from './quiz-engine.js';
import type { QuizQuestion } from './quiz-payload.js';
import type { QuizState } from './useQuiz.js';

export type QuizPhase = 'briefing' | 'question' | 'feedback' | 'debrief';
export type QuizDebriefAction = 'restart' | 'new-round' | 'weak-spots' | 'raise-level' | 'transfer' | 'exam';

/** Optional fields the generator can add without changing the current payload contract. */
export interface QuizQuestionEnhancements {
  concept?: string;
  hints?: string[];
  skill?: string;
}

export interface QuizActionContext {
  weakTopics: string[];
  score: number;
  total: number;
}

export interface QuizModeProps extends ModeProps {
  quizState: QuizState;
  onNewRound: () => void;
  onAction?: (action: QuizDebriefAction, context: QuizActionContext) => void;
}

interface QuizResponse {
  selectedIndex?: number;
  answer?: string;
  correct: boolean;
  confidence: Confidence;
  hintsUsed: number;
}

const MAX_HINTS = 3;

export function QuizMode({
  contentWidth,
  contentHeight,
  inputActive,
  commandMenuActive,
  quizState,
  onNewRound,
  onAction,
}: QuizModeProps) {
  const [phase, setPhase] = React.useState<QuizPhase>('briefing');
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [freeResponse, setFreeResponse] = React.useState('');
  const [confidence, setConfidence] = React.useState<Confidence>('think-so');
  const [confidenceFocus, setConfidenceFocus] = React.useState(false);
  const [hintLevel, setHintLevel] = React.useState(0);
  const [responses, setResponses] = React.useState<QuizResponse[]>([]);
  const [score, setScore] = React.useState(0);

  const questions = quizState.status === 'ready' ? quizState.quiz.questions : [];
  const quizSignature = questions.map(question => question.question).join('\u0000');

  const restart = React.useCallback(() => {
    setPhase('briefing');
    setQuestionIndex(0);
    setSelectedIndex(0);
    setFreeResponse('');
    setConfidence('think-so');
    setConfidenceFocus(false);
    setHintLevel(0);
    setResponses([]);
    setScore(0);
  }, []);

  const startNewRound = React.useCallback(() => {
    restart();
    onNewRound();
  }, [onNewRound, restart]);

  React.useEffect(() => {
    if (quizSignature) restart();
  }, [quizSignature, restart]);

  const actionContext = React.useMemo<QuizActionContext>(() => {
    const weakTopics = questions.filter((_, index) => responses[index] && !responses[index].correct);
    return {
      weakTopics: [...new Set(weakTopics.map(question => conceptFor(question)))],
      score,
      total: questions.length,
    };
  }, [questions, responses, score]);

  const runDebriefAction = React.useCallback(
    (action: QuizDebriefAction) => {
      onAction?.(action, actionContext);

      if (action === 'restart') {
        restart();
        return;
      }
      if (action === 'new-round') {
        startNewRound();
        return;
      }
      restart();
    },
    [actionContext, onAction, restart, startNewRound],
  );

  useAppKeys(
    ({ input, key }) => {
      if (quizState.status !== 'ready') return;

      if (phase === 'debrief') {
        const actionByKey: Record<string, QuizDebriefAction> = {
          r: 'restart',
          n: 'new-round',
          w: 'weak-spots',
          l: 'raise-level',
          t: 'transfer',
          e: 'exam',
        };
        const action = actionByKey[input.toLowerCase()];
        if (action) runDebriefAction(action);
        return;
      }

      const question = questions[questionIndex];
      if (!question) return;
      const choices = question.choices ?? [];

      if (phase === 'briefing') {
        if (input.toLowerCase() === 'n') {
          startNewRound();
          return;
        }
        if (key.return) {
          setPhase('question');
          return;
        }
        if (isMultipleChoice(question) && /^[1-9]$/u.test(input)) {
          const choiceIndex = Number(input) - 1;
          if (choiceIndex < choices.length) {
            setSelectedIndex(choiceIndex);
            setPhase('question');
          }
        }
        return;
      }

      if (phase === 'feedback') {
        if (!key.return) return;
        if (questionIndex >= questions.length - 1) {
          setPhase('debrief');
          return;
        }
        setQuestionIndex(current => current + 1);
        setSelectedIndex(0);
        setFreeResponse('');
        setConfidence('think-so');
        setConfidenceFocus(false);
        setHintLevel(0);
        setPhase('question');
        return;
      }

      if (confidenceFocus) {
        if (key.upArrow) {
          setConfidence(current => confidenceAt(confidenceIndex(current) + 1));
          return;
        }
        if (key.downArrow) {
          setConfidence(current => confidenceAt(confidenceIndex(current) - 1));
          return;
        }
        if (/^[1-3]$/u.test(input)) {
          setConfidence(confidenceAt(Number(input) - 1));
          return;
        }
        if (input.toLowerCase() === 'c' || key.return) {
          setConfidenceFocus(false);
        }
        return;
      }

      if (!isMultipleChoice(question)) {
        if (key.backspace || key.delete) {
          setFreeResponse(current => current.slice(0, -1));
          return;
        }
        if (key.space) {
          setFreeResponse(current => `${current} `);
          return;
        }
        if (!freeResponse && input.toLowerCase() === 'c') {
          setConfidenceFocus(true);
          return;
        }
        if (!freeResponse && input.toLowerCase() === 'h') {
          setHintLevel(current => Math.min(MAX_HINTS, current + 1));
          return;
        }
        if (input && !key.ctrl && !key.meta && !key.return) {
          setFreeResponse(current => `${current}${input}`);
          return;
        }
      }

      if (isMultipleChoice(question) && key.upArrow) {
        setSelectedIndex(current => (current - 1 + choices.length) % choices.length);
        return;
      }
      if (isMultipleChoice(question) && key.downArrow) {
        setSelectedIndex(current => (current + 1) % choices.length);
        return;
      }
      if (isMultipleChoice(question) && /^[1-9]$/u.test(input)) {
        const choiceIndex = Number(input) - 1;
        if (choiceIndex < choices.length) setSelectedIndex(choiceIndex);
        return;
      }
      if (input.toLowerCase() === 'c') {
        setConfidenceFocus(true);
        return;
      }
      if (input.toLowerCase() === 'h') {
        setHintLevel(current => Math.min(MAX_HINTS, current + 1));
        return;
      }
      if (!key.return) return;

      const correct = isMultipleChoice(question)
        ? selectedIndex === question.correctIndex
        : gradeFreeResponse(freeResponse, question);
      const response: QuizResponse = {
        ...(isMultipleChoice(question) ? { selectedIndex } : { answer: freeResponse }),
        correct,
        confidence,
        hintsUsed: hintLevel,
      };
      setResponses(current => [...current.slice(0, questionIndex), response]);
      if (correct) setScore(current => current + 1);
      setPhase('feedback');
    },
    { isActive: inputActive && !commandMenuActive },
  );

  if (quizState.status === 'loading') {
    return <QuizMessage status="generating" message="Building a quiz sized to your study material..." />;
  }

  if (quizState.status === 'error') {
    return <QuizMessage status="error" message={quizState.error} />;
  }

  const question = questions[questionIndex];
  if (!question) return <QuizMessage status="error" message="This quiz has no questions." />;

  if (phase === 'briefing') {
    return (
      <box key="quiz-briefing" style={{ flexDirection: 'column' }}>
        <QuizHeader status={`${questions.length} questions · ${conceptCount(questions)} concepts`} />
        <RoundBriefing
          question={question}
          questions={questions}
          contentWidth={contentWidth}
          contentHeight={contentHeight}
        />
      </box>
    );
  }

  if (phase === 'debrief') {
    return (
      <box key="quiz-debrief" style={{ flexDirection: 'column' }}>
        <QuizHeader status="round complete" />
        <Debrief
          questions={questions}
          responses={responses}
          score={score}
          contentWidth={contentWidth}
          contentHeight={contentHeight}
        />
      </box>
    );
  }

  const response = responses[questionIndex];
  const multipleChoice = isMultipleChoice(question);
  const answerIsCorrect = response?.correct ?? (multipleChoice && selectedIndex === question.correctIndex);
  const answeredCount = responses.length;
  const bodyHeight = Math.max(1, contentHeight - 3);
  const choiceWidth = Math.max(1, contentWidth - 7);
  const choices = question.choices ?? [];
  const visibleQuestion = wrapText(question.question, contentWidth);
  const visibleExplanation = wrapText(question.explanation, contentWidth);

  return (
    <box key={`quiz-${phase}-${questionIndex}`} style={{ flexDirection: 'column' }}>
      <QuizHeader status={`${questionIndex + 1}/${questions.length} · ${score} correct`} />
      <box style={{ height: bodyHeight, flexDirection: 'column', overflow: 'hidden' }}>
        <text fg={THEME.primary}>{`${conceptFor(question)}  ·  ${question.difficulty}`}</text>
        {visibleQuestion.map((line, index) => (
          <text key={line} fg={THEME.text} attributes={index === 0 ? TextAttributes.BOLD : TextAttributes.NONE}>
            {line}
          </text>
        ))}

        <box style={{ flexDirection: 'column', marginTop: 2 }}>
          {multipleChoice ? (
            choices.map((choice, index) => {
              const selected = index === selectedIndex;
              const correct = phase === 'feedback' && index === question.correctIndex;
              const incorrect = phase === 'feedback' && selected && !correct;
              const marker = correct ? '✓' : incorrect ? 'x' : selected ? '>' : ' ';
              const color = correct ? THEME.success : incorrect ? THEME.danger : selected ? THEME.primary : THEME.text;

              return (
                <text key={choice} fg={color} attributes={selected ? TextAttributes.BOLD : TextAttributes.NONE}>
                  {`${marker} ${index + 1}. ${truncate(choice, choiceWidth)}`}
                </text>
              );
            })
          ) : (
            <text fg={THEME.primary} attributes={TextAttributes.BOLD}>
              {`Answer: ${freeResponse || 'type a short answer, then press enter'}`}
            </text>
          )}
        </box>

        {hintLevel > 0 && phase === 'question' && (
          <box style={{ flexDirection: 'column', marginTop: 2 }}>
            <text fg={THEME.primary}>{`Hint ${hintLevel}/${MAX_HINTS}`}</text>
            <text fg={THEME.textMuted}>{truncate(hintFor(question, hintLevel), Math.max(1, contentWidth - 2))}</text>
          </box>
        )}

        {phase === 'feedback' && (
          <box style={{ flexDirection: 'column', marginTop: 2 }}>
            <text fg={answerIsCorrect ? THEME.success : THEME.danger} attributes={TextAttributes.BOLD}>
              {answerIsCorrect
                ? evidenceMessage(response?.confidence ?? confidence, response?.hintsUsed ?? hintLevel)
                : `Not quite. Expected: ${truncate(question.expectedAnswer ?? 'Review the explanation.', choiceWidth)}`}
            </text>
            {visibleExplanation.slice(0, 2).map(line => (
              <text key={line} fg={THEME.textMuted}>
                {line}
              </text>
            ))}
            {question.sourceAnchor && (
              <text fg={THEME.textFaint}>{`Source: ${truncate(question.sourceAnchor, choiceWidth)}`}</text>
            )}
            <text
              fg={THEME.textMuted}
            >{`Confidence ${confidenceLabel(response?.confidence ?? confidence)}${response?.hintsUsed ? ` · ${response.hintsUsed} hint${response.hintsUsed === 1 ? '' : 's'}` : ''} · enter next`}</text>
          </box>
        )}

        {phase === 'question' && (
          <box style={{ flexDirection: 'column', marginTop: 2, flexShrink: 0 }}>
            <text fg={confidenceFocus ? THEME.primary : THEME.textMuted}>
              {confidenceFocus
                ? `Confidence ${confidenceLabel(confidence)} · 1 unsure · 2 think so · 3 certain · enter keep`
                : multipleChoice
                  ? `1-${choices.length} choose · c confidence ${confidenceLabel(confidence)} · h hint ${hintLevel}/${MAX_HINTS} · enter check`
                  : `type answer · c confidence ${confidenceLabel(confidence)} · h hint ${hintLevel}/${MAX_HINTS} · enter check`}
            </text>
            <ConceptProgress questions={questions} responses={responses} width={contentWidth} />
            <text fg={THEME.textFaint}>{progressLine(answeredCount, questions.length, contentWidth)}</text>
          </box>
        )}
      </box>
    </box>
  );
}

function RoundBriefing({
  question,
  questions,
  contentWidth,
  contentHeight,
}: {
  question: QuizQuestion;
  questions: QuizQuestion[];
  contentWidth: number;
  contentHeight: number;
}) {
  const choices = question.choices ?? [];
  const wide = contentWidth >= 90;
  const overviewWidth = Math.min(34, Math.floor(contentWidth * 0.32));
  const taskWidth = wide ? Math.max(40, contentWidth - overviewWidth - 4) : contentWidth;
  const task = (
    <box style={{ flexDirection: 'column', width: taskWidth }}>
      <text fg={THEME.primary}>{`Warm-up · ${conceptFor(question)}`}</text>
      {wrapText(question.question, taskWidth).map((line, index) => (
        <text key={line} fg={THEME.text} attributes={index === 0 ? TextAttributes.BOLD : TextAttributes.NONE}>
          {line}
        </text>
      ))}
      <box style={{ flexDirection: 'column', marginTop: 1 }}>
        {choices.length > 0 ? (
          choices.map((choice, index) => (
            <text key={choice} fg={index === 0 ? THEME.primary : THEME.textMuted}>
              {`${index === 0 ? '>' : ' '} ${index + 1}. ${truncate(choice, Math.max(1, taskWidth - 7))}`}
            </text>
          ))
        ) : (
          <text fg={THEME.textMuted}>Free recall · type your answer after begin</text>
        )}
      </box>
      <box style={{ marginTop: 2 }}>
        <text fg={THEME.textMuted}>enter begin · 1-4 choose immediately · n new round</text>
      </box>
    </box>
  );

  return (
    <box style={{ height: Math.max(1, contentHeight - 3), flexDirection: 'column', overflow: 'hidden' }}>
      <box style={{ marginTop: contentHeight >= 24 ? 2 : 0, flexDirection: 'column' }}>
        <text fg={THEME.primary} attributes={TextAttributes.BOLD}>
          Round briefing
        </text>
        <text fg={THEME.textMuted}>Recall first. Use hints only when retrieval stalls.</text>
      </box>
      {wide ? (
        <box style={{ flexDirection: 'row', marginTop: 2 }}>
          <RoundOverview questions={questions} width={overviewWidth} />
          <box style={{ width: 4 }} />
          {task}
        </box>
      ) : (
        <box style={{ flexDirection: 'column', marginTop: 2 }}>
          <RoundOverview questions={questions} width={contentWidth} compact />
          <box style={{ marginTop: 2 }}>{task}</box>
        </box>
      )}
    </box>
  );
}

function RoundOverview({
  questions,
  width,
  compact = false,
}: {
  questions: QuizQuestion[];
  width: number;
  compact?: boolean;
}) {
  const concepts = [...new Set(questions.map(conceptFor))];
  const multipleChoiceCount = questions.filter(isMultipleChoice).length;
  const recallCount = questions.length - multipleChoiceCount;
  const minutes = Math.max(2, Math.ceil(questions.length * 1.25));

  if (compact) {
    return (
      <box style={{ flexDirection: 'column' }}>
        <text fg={THEME.text}>{`${questions.length} questions · about ${minutes} min · mixed depth`}</text>
        <text fg={THEME.textMuted}>{truncate(concepts.join(' · '), width)}</text>
      </box>
    );
  }

  const visibleConcepts = concepts.slice(0, 6);
  return (
    <box style={{ flexDirection: 'column', width }}>
      <text fg={THEME.text} attributes={TextAttributes.BOLD}>
        This round
      </text>
      <box style={{ marginTop: 1, flexDirection: 'column' }}>
        <text fg={THEME.textMuted}>{`${questions.length} questions · about ${minutes} min`}</text>
        <text fg={THEME.textMuted}>{`${recallCount} recall · ${multipleChoiceCount} multiple choice`}</text>
        <text fg={THEME.textMuted}>Adaptive depth</text>
      </box>
      <box style={{ marginTop: 2, flexDirection: 'column' }}>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          Concepts
        </text>
        {visibleConcepts.map(concept => (
          <text key={concept} fg={THEME.textMuted}>{`· ${truncate(concept, Math.max(1, width - 2))}`}</text>
        ))}
        {concepts.length > visibleConcepts.length && (
          <text fg={THEME.textFaint}>{`+ ${concepts.length - visibleConcepts.length} more`}</text>
        )}
      </box>
    </box>
  );
}

function Debrief({
  questions,
  responses,
  score,
  contentWidth,
  contentHeight,
}: {
  questions: QuizQuestion[];
  responses: QuizResponse[];
  score: number;
  contentWidth: number;
  contentHeight: number;
}) {
  const total = questions.length;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const weakTopics = [
    ...new Set(questions.filter((_, index) => responses[index] && !responses[index].correct).map(conceptFor)),
  ];
  const reviewRows = Math.max(1, Math.min(questions.length, contentHeight - 12));

  return (
    <box style={{ height: Math.max(1, contentHeight - 3), flexDirection: 'column', overflow: 'hidden' }}>
      <text fg={THEME.primary} attributes={TextAttributes.BOLD}>{`${score} / ${total} correct  ·  ${accuracy}%`}</text>
      <text fg={THEME.text}>{scoreLabel(score, total)}</text>
      <ConceptProgress questions={questions} responses={responses} width={contentWidth} />
      <text fg={weakTopics.length > 0 ? THEME.danger : THEME.success}>
        {weakTopics.length > 0
          ? `Review next: ${truncate(weakTopics.join(', '), Math.max(1, contentWidth - 14))}`
          : 'No weak concepts flagged in this round.'}
      </text>

      <box style={{ flexDirection: 'column', marginTop: 2 }}>
        <text fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
          Answer review
        </text>
        {questions.slice(0, reviewRows).map((item, index) => {
          const response = responses[index];
          const correct = response?.correct ?? false;
          const detail = response ? ` · ${confidenceLabel(response.confidence)}` : '';
          return (
            <text key={item.question} fg={correct ? THEME.success : THEME.danger}>
              {`${correct ? '✓' : 'x'} ${truncate(conceptFor(item), Math.max(1, contentWidth - 28))}${detail}`}
            </text>
          );
        })}
        {reviewRows < total && <text fg={THEME.textMuted}>{`+ ${total - reviewRows} more`}</text>}
      </box>

      <box style={{ flexDirection: 'column', marginTop: 2, flexShrink: 0 }}>
        <text fg={THEME.textMuted}>Actions</text>
        <text fg={THEME.primary}>r restart · n new round · w weak spots</text>
        <text fg={THEME.primary}>l raise level · t transfer · e exam</text>
      </box>
    </box>
  );
}

function ConceptProgress({
  questions,
  responses,
  width,
}: {
  questions: QuizQuestion[];
  responses: QuizResponse[];
  width: number;
}) {
  const evidence = responses.reduce(
    (store, response, index) => {
      const question = questions[index];
      if (!question) return store;
      return recordAnswer(store, {
        conceptId: conceptFor(question),
        correct: response.correct,
        confidence: response.confidence,
        hintCount: response.hintsUsed,
        depth: question.depth ?? (isMultipleChoice(question) ? 'recognition' : 'recall'),
        errorClassification: response.correct
          ? 'none'
          : response.confidence === 'certain'
            ? 'misconception'
            : 'unknown',
      });
    },
    createLearnerEvidence([...new Set(questions.map(conceptFor))]),
  );

  const concepts = [...new Set(questions.map(conceptFor))].map(concept => {
    const state = getConceptState(evidence, concept);
    const marker = state === 'secure' ? '✓' : state === 'developing' ? '~' : state === 'untested' ? '·' : '!';
    return `${marker} ${truncate(concept, 16)} ${state}`;
  });
  return <text fg={THEME.textMuted}>{truncate(`Concepts  ${concepts.join('  ')}`, width)}</text>;
}

function QuizHeader({ status }: { status: string }) {
  return (
    <box style={{ flexDirection: 'row', marginTop: 1, marginBottom: 1, justifyContent: 'space-between' }}>
      <text fg={THEME.text} attributes={TextAttributes.BOLD}>
        Quiz
      </text>
      <text fg={THEME.textMuted}>{status}</text>
    </box>
  );
}

function QuizMessage({ status, message }: { status: string; message: string }) {
  return (
    <box style={{ flexDirection: 'column' }}>
      <QuizHeader status={status} />
      <text fg={status === 'error' ? THEME.danger : THEME.text}>{message}</text>
    </box>
  );
}

function isMultipleChoice(
  question: QuizQuestion,
): question is QuizQuestion & { choices: string[]; correctIndex: number } {
  return Array.isArray(question.choices) && Number.isInteger(question.correctIndex);
}

function gradeFreeResponse(answer: string, question: QuizQuestion): boolean {
  if (!answer.trim() || !question.expectedAnswer?.trim()) return false;
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  const normalizedAnswer = normalize(answer);
  const normalizedExpected = normalize(question.expectedAnswer);
  const gradingPoints = (question.gradingPoints ?? []).map(normalize).filter(Boolean);
  const matchedPoints = gradingPoints.filter(point => normalizedAnswer.includes(point));
  if (gradingPoints.length > 0 && matchedPoints.length >= Math.ceil(gradingPoints.length * 0.7)) return true;
  return (
    normalizedAnswer === normalizedExpected ||
    (normalizedAnswer.length >= 5 && normalizedExpected.includes(normalizedAnswer)) ||
    (normalizedExpected.length >= 5 && normalizedAnswer.includes(normalizedExpected))
  );
}

function conceptFor(question: QuizQuestion): string {
  const enhanced = question as QuizQuestion & QuizQuestionEnhancements;
  return enhanced.concept?.trim() || question.topic || 'Core concept';
}

function conceptCount(questions: QuizQuestion[]): number {
  return new Set(questions.map(conceptFor)).size;
}

function hintFor(question: QuizQuestion, level: number): string {
  const enhanced = question as QuizQuestion & QuizQuestionEnhancements;
  const customHint = enhanced.hints?.[level - 1];
  if (customHint) return customHint;
  if (level === 1) return `Start with the core idea behind ${conceptFor(question)}.`;
  if (level === 2) return 'Eliminate choices that describe a neighboring idea or an example instead of the principle.';
  return 'Look for the choice that best matches the explanation you would give to a classmate.';
}

function progressLine(answered: number, total: number, width: number): string {
  const progressWidth = Math.max(4, Math.min(24, width - 35));
  const completedWidth = total > 0 ? Math.round((answered / total) * progressWidth) : 0;
  return `${'━'.repeat(completedWidth)}${'─'.repeat(progressWidth - completedWidth)}  ${answered}/${total} answered`;
}

function wrapText(value: string, width: number): string[] {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  if (!normalized) return [' '];
  const lines: string[] = [];
  let line = '';
  for (const word of normalized.split(' ')) {
    if (!line) {
      line = word;
    } else if (line.length + word.length + 1 <= width) {
      line += ` ${word}`;
    } else {
      lines.push(truncate(line, width));
      line = word;
    }
  }
  if (line) lines.push(truncate(line, width));
  return lines;
}

function scoreLabel(score: number, total: number): string {
  const ratio = total > 0 ? score / total : 0;
  if (ratio === 1) return 'Perfect score. Push one level deeper next time.';
  if (ratio >= 0.8) return 'Strong result. The flagged concepts are a good next review.';
  if (ratio >= 0.6) return 'Good start. Revisit the explanations, then try a transfer question.';
  return 'Review the material, then use a fresh round to rebuild recall.';
}

const CONFIDENCE_LEVELS: Confidence[] = ['unsure', 'think-so', 'certain'];

function confidenceIndex(confidence: Confidence): number {
  return CONFIDENCE_LEVELS.indexOf(confidence);
}

function confidenceAt(index: number): Confidence {
  return CONFIDENCE_LEVELS[Math.max(0, Math.min(CONFIDENCE_LEVELS.length - 1, index))] ?? 'think-so';
}

function confidenceLabel(confidence: Confidence): string {
  return confidence === 'think-so' ? 'think so' : confidence;
}

function evidenceMessage(confidence: Confidence, hintsUsed: number): string {
  if (hintsUsed > 0) return 'Correct with support. This concept is still developing.';
  if (confidence === 'unsure') return 'Correct, but low confidence makes this recall fragile.';
  return confidence === 'certain'
    ? 'Correct with confidence. A deeper question can now test transfer.'
    : 'Correct. This adds clean recall evidence.';
}
