import React from 'react';
import type { Provider } from '../../../../domain/provider.js';
import { materialService, type ResolvedMaterial } from '../../../../infrastructure/materials/index.js';
import { createProvider } from '../../../../providers/index.js';
import { getSessionById, saveSessionResult } from '../../../../utils/sessions.js';
import { generateQuiz } from './generate-quiz.js';
import { normalizeQuizPayload, type QuizPayload } from './quiz-payload.js';

export type QuizState =
  | { status: 'loading' }
  | { status: 'ready'; quiz: QuizPayload }
  | { status: 'error'; error: string };

export interface UseQuizOptions {
  enabled: boolean;
  sessionId: string | null;
  modelProvider: Provider | null;
  model: string | null;
  reasoningEffort?: string;
  materialPath: string;
  studyLanguage: string;
}

export function useQuiz(options: UseQuizOptions): QuizState {
  const { enabled, sessionId, modelProvider, model, materialPath, studyLanguage, reasoningEffort } = options;
  const [state, setState] = React.useState<QuizState>(() => initialState(sessionId));

  React.useEffect(() => {
    if (!enabled) return;

    if (!sessionId) {
      setState({ status: 'error', error: 'No active session was created.' });
      return;
    }

    const storedQuiz = normalizeQuizPayload(getSessionById(sessionId)?.modeResults.quiz);
    if (storedQuiz) {
      setState({ status: 'ready', quiz: storedQuiz });
      return;
    }
    if (!modelProvider || !model) {
      setState({ status: 'error', error: 'No model is selected for this session.' });
      return;
    }
    if (!materialPath) {
      setState({ status: 'error', error: 'No study material is attached to this session.' });
      return;
    }

    let material: ResolvedMaterial;
    try {
      material = materialService.resolve(materialPath);
    } catch {
      setState({ status: 'error', error: 'The selected study material could not be found.' });
      return;
    }

    const provider = createProvider(modelProvider);
    if (!provider) {
      setState({ status: 'error', error: 'The selected provider is unavailable.' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading' });

    void generateQuiz({
      provider,
      model,
      reasoningEffort,
      material,
      studyLanguage,
      signal: controller.signal,
    })
      .then(quiz => {
        saveSessionResult(sessionId, { quiz });
        setState({ status: 'ready', quiz });
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', error: error instanceof Error ? error.message : String(error) });
        }
      });

    return () => controller.abort();
  }, [enabled, materialPath, model, modelProvider, reasoningEffort, sessionId, studyLanguage]);

  return state;
}

function initialState(sessionId: string | null): QuizState {
  const storedQuiz = normalizeQuizPayload(sessionId ? getSessionById(sessionId)?.modeResults.quiz : null);
  return storedQuiz ? { status: 'ready', quiz: storedQuiz } : { status: 'loading' };
}
