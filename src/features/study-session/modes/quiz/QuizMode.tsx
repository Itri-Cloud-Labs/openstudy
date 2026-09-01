import React from 'react';
import { TextAttributes } from '@opentui/core';
import { useAppKeys } from '../../../../shared/terminal/keymap.js';
import { THEME } from '../../../../shared/theme.js';
import { truncate } from '../../../../shared/text.js';
import type { ModeProps } from '../summary/SummaryMode.js';
import type { QuizState } from './useQuiz.js';

export interface QuizModeProps extends ModeProps {
  quizState: QuizState;
  onNewRound: () => void;
}

export function QuizMode({
  contentWidth,
  contentHeight,
  inputActive,
  commandMenuActive,
  quizState,
  onNewRound,
}: QuizModeProps) {
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [complete, setComplete] = React.useState(false);
  const [answers, setAnswers] = React.useState<number[]>([]);
  const question = quizState.status === 'ready' ? quizState.quiz.questions[questionIndex] : null;

  const restart = React.useCallback(() => {
    setQuestionIndex(0);
    setSelectedIndex(0);
    setRevealed(false);
    setScore(0);
    setComplete(false);
    setAnswers([]);
  }, []);

  const startNewRound = React.useCallback(() => {
    restart();
    onNewRound();
  }, [onNewRound, restart]);

  useAppKeys(
    ({ input, key }) => {
      if (quizState.status !== 'ready') return;

      if (complete) {
        if (input.toLowerCase() === 'n') {
          startNewRound();
          return;
        }
        if (key.return || input.toLowerCase() === 'r') {
          restart();
        }
        return;
      }

      const activeQuestion = quizState.quiz.questions[questionIndex];
      if (!activeQuestion) return;

      if (!revealed && key.upArrow) {
        setSelectedIndex(current => (current - 1 + activeQuestion.choices.length) % activeQuestion.choices.length);
        return;
      }
      if (!revealed && key.downArrow) {
        setSelectedIndex(current => (current + 1) % activeQuestion.choices.length);
        return;
      }
      if (!revealed && /^[1-9]$/u.test(input)) {
        const choiceIndex = Number(input) - 1;
        if (choiceIndex < activeQuestion.choices.length) setSelectedIndex(choiceIndex);
        return;
      }
      if (!key.return) return;

      if (!revealed) {
        if (selectedIndex === activeQuestion.correctIndex) setScore(current => current + 1);
        setAnswers(current => [...current, selectedIndex]);
        setRevealed(true);
        return;
      }

      if (questionIndex >= quizState.quiz.questions.length - 1) {
        setComplete(true);
        return;
      }

      setQuestionIndex(current => current + 1);
      setSelectedIndex(0);
      setRevealed(false);
    },
    { isActive: inputActive && !commandMenuActive },
  );

  if (quizState.status === 'loading') {
    return <QuizMessage status="generating" message="Building a quiz sized to your study material..." />;
  }

  if (quizState.status === 'error') {
    return <QuizMessage status="error" message={quizState.error} />;
  }

  if (complete) {
    const total = quizState.quiz.questions.length;
    const accuracy = Math.round((score / total) * 100);
    const reviewRows = Math.max(1, contentHeight - 9);
    const review = quizState.quiz.questions.slice(0, reviewRows);
    return (
      <box style={{ flexDirection: 'column' }}>
        <QuizHeader status="complete" />
        <box style={{ height: Math.max(1, contentHeight - 3), flexDirection: 'column', overflow: 'hidden' }}>
          <text fg={THEME.primary} attributes={TextAttributes.BOLD}>
            {`${score} / ${total} correct  ·  ${accuracy}%`}
          </text>
          <text fg={THEME.text}>{scoreLabel(score, total)}</text>

          <box style={{ flexDirection: 'column', marginTop: 1 }}>
            <text fg={THEME.textMuted} attributes={TextAttributes.BOLD}>
              Answer review
            </text>
            {review.map((item, index) => {
              const correct = answers[index] === item.correctIndex;
              return (
                <text key={item.question} fg={correct ? THEME.success : THEME.danger}>
                  {`${correct ? '✓' : 'x'} ${truncate(item.topic, Math.max(1, contentWidth - 16))}  ${item.difficulty}`}
                </text>
              );
            })}
            {review.length < total && <text fg={THEME.textMuted}>{`+ ${total - review.length} more`}</text>}
          </box>

          <box style={{ marginTop: 1 }}>
            <text fg={THEME.textMuted}>r or enter restart this quiz · n generate new questions</text>
          </box>
        </box>
      </box>
    );
  }

  if (!question) return <QuizMessage status="error" message="This quiz has no questions." />;

  const choiceWidth = Math.max(1, contentWidth - 7);
  const answerIsCorrect = selectedIndex === question.correctIndex;
  const total = quizState.quiz.questions.length;
  const progressWidth = Math.max(4, Math.min(28, contentWidth - 34));
  const completedWidth = Math.round((answers.length / total) * progressWidth);

  return (
    <box style={{ flexDirection: 'column' }}>
      <QuizHeader status={`${questionIndex + 1}/${total}  score ${score}`} />
      <box style={{ height: Math.max(1, contentHeight - 3), flexDirection: 'column', overflow: 'hidden' }}>
        <text fg={THEME.primary}>{`${question.topic}  ·  ${question.difficulty}`}</text>
        <text fg={THEME.text} attributes={TextAttributes.BOLD}>
          {question.question}
        </text>

        <box style={{ flexDirection: 'column', marginTop: 1 }}>
          {question.choices.map((choice, index) => {
            const selected = index === selectedIndex;
            const correct = revealed && index === question.correctIndex;
            const incorrect = revealed && selected && !correct;
            const marker = correct ? '✓' : incorrect ? 'x' : selected ? '>' : ' ';
            const color = correct ? THEME.success : incorrect ? THEME.danger : selected ? THEME.primary : THEME.text;

            return (
              <text key={choice} fg={color} attributes={selected ? TextAttributes.BOLD : TextAttributes.NONE}>
                {`${marker} ${index + 1}. ${truncate(choice, choiceWidth)}`}
              </text>
            );
          })}
        </box>

        {revealed && (
          <box style={{ flexDirection: 'column', marginTop: 1 }}>
            <text fg={answerIsCorrect ? THEME.success : THEME.danger} attributes={TextAttributes.BOLD}>
              {answerIsCorrect ? 'Correct.' : `Not quite. Answer ${question.correctIndex + 1} is correct.`}
            </text>
            <text fg={THEME.textMuted}>{question.explanation}</text>
            <text fg={THEME.textMuted}>enter next</text>
          </box>
        )}

        {!revealed && (
          <box style={{ marginTop: 1 }}>
            <text fg={THEME.textMuted}>1-4 or up/down choose · enter check</text>
          </box>
        )}

        {!revealed && (
          <box style={{ marginTop: 1 }}>
            <text fg={THEME.textMuted}>
              {`${'━'.repeat(completedWidth)}${'─'.repeat(progressWidth - completedWidth)}  ${answers.length} answered  ·  ${total - answers.length} remaining`}
            </text>
          </box>
        )}
      </box>
    </box>
  );
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

function scoreLabel(score: number, total: number): string {
  const ratio = total > 0 ? score / total : 0;
  if (ratio === 1) return 'Perfect score.';
  if (ratio >= 0.8) return 'Strong result.';
  if (ratio >= 0.6) return 'Good start. Review the explanations and try again.';
  return 'Review the material, then give it another try.';
}
