import React from 'react';
import { TextAttributes } from '@opentui/core';
import { useAppKeys } from '../../../../shared/terminal/keymap.js';
import { THEME } from '../../../../shared/theme.js';
import { truncate } from '../../../../shared/text.js';
import type { ModeProps } from '../summary/SummaryMode.js';
import type { QuizState } from './useQuiz.js';

export interface QuizModeProps extends ModeProps {
  quizState: QuizState;
}

export function QuizMode({ contentWidth, contentHeight, inputActive, commandMenuActive, quizState }: QuizModeProps) {
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [complete, setComplete] = React.useState(false);
  const question = quizState.status === 'ready' ? quizState.quiz.questions[questionIndex] : null;

  useAppKeys(
    ({ input, key }) => {
      if (quizState.status !== 'ready') return;

      if (complete) {
        if (key.return || input.toLowerCase() === 'r') {
          setQuestionIndex(0);
          setSelectedIndex(0);
          setRevealed(false);
          setScore(0);
          setComplete(false);
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
    return <QuizMessage status="generating" message="Generating five questions from your study material..." />;
  }

  if (quizState.status === 'error') {
    return <QuizMessage status="error" message={quizState.error} />;
  }

  if (complete) {
    const total = quizState.quiz.questions.length;
    return (
      <box style={{ flexDirection: 'column' }}>
        <QuizHeader status="complete" />
        <box style={{ height: Math.max(1, contentHeight - 3), flexDirection: 'column', justifyContent: 'center' }}>
          <text fg={THEME.primary} attributes={TextAttributes.BOLD}>
            {`${score} / ${total}`}
          </text>
          <text fg={THEME.text}>{scoreLabel(score, total)}</text>
          <box style={{ marginTop: 1 }}>
            <text fg={THEME.textMuted}>enter or r restart</text>
          </box>
        </box>
      </box>
    );
  }

  if (!question) return <QuizMessage status="error" message="This quiz has no questions." />;

  const choiceWidth = Math.max(1, contentWidth - 7);
  const answerIsCorrect = selectedIndex === question.correctIndex;

  return (
    <box style={{ flexDirection: 'column' }}>
      <QuizHeader status={`${questionIndex + 1}/${quizState.quiz.questions.length}  score ${score}`} />
      <box style={{ height: Math.max(1, contentHeight - 3), flexDirection: 'column', overflow: 'hidden' }}>
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
