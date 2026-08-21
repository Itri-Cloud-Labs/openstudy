import React from 'react';
import { materialService, type ResolvedMaterial } from '../../../../infrastructure/materials/index.js';
import { createProvider } from '../../../../providers/index.js';
import { truncate } from '../../../../shared/text.js';
import type { Provider } from '../../../../types/index.js';
import { getSessionById, saveSessionById } from '../../../../utils/index.js';
import { generateSummary } from './generate-summary.js';

export interface SummaryState {
  status: 'loading' | 'ready' | 'error';
  response: string;
  error?: string;
}

export interface UseSummaryOptions {
  sessionId: string | null;
  prompt: string;
  modelProvider: Provider | null;
  model: string | null;
  reasoningEffort?: string;
  materialPath: string;
  studyLanguage: string;
}

export function useSummary(options: UseSummaryOptions) {
  const [title, setTitle] = React.useState(truncate(options.prompt, 50));
  const [summaryState, setSummaryState] = React.useState<SummaryState>(() => initialState(options.sessionId));

  React.useEffect(() => {
    const { sessionId, prompt, modelProvider, model, materialPath, studyLanguage, reasoningEffort } = options;
    if (!sessionId) {
      setSummaryState({ status: 'error', response: '', error: 'No active session was created.' });
      return;
    }

    const storedSession = getSessionById(sessionId);
    if (storedSession?.summaryText) {
      setSummaryState({ status: 'ready', response: storedSession.summaryText });
      setTitle(storedSession.title ?? truncate(prompt, 50));
      return;
    }
    if (!modelProvider || !model) {
      setSummaryState({ status: 'error', response: '', error: 'No model is selected for this session.' });
      return;
    }
    if (!materialPath) {
      setSummaryState({ status: 'error', response: '', error: 'No study material is attached to this session.' });
      return;
    }

    let material: ResolvedMaterial;
    try {
      material = materialService.resolve(materialPath);
    } catch {
      setSummaryState({ status: 'error', response: '', error: 'The selected study material could not be found.' });
      return;
    }

    const provider = createProvider(modelProvider);
    if (!provider) {
      setSummaryState({ status: 'error', response: '', error: 'The selected provider is unavailable.' });
      return;
    }

    const controller = new AbortController();
    setSummaryState({ status: 'loading', response: '' });

    void (async () => {
      try {
        const summary = await generateSummary({
          provider,
          model,
          reasoningEffort,
          material,
          studyLanguage,
          signal: controller.signal,
        });

        const current = getSessionById(sessionId);
        if (current) {
          saveSessionById(sessionId, {
            ...current,
            title: summary.SessionTitle,
            summaryText: summary.content,
          });
        }
        setTitle(truncate(summary.SessionTitle, 50));
        setSummaryState({ status: 'ready', response: summary.content });
      } catch (error) {
        if (!controller.signal.aborted) {
          setSummaryState({
            status: 'error',
            response: '',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => controller.abort();
  }, [
    options.materialPath,
    options.model,
    options.modelProvider,
    options.prompt,
    options.reasoningEffort,
    options.sessionId,
    options.studyLanguage,
  ]);

  return { summaryState, title };
}

function initialState(sessionId: string | null): SummaryState {
  const stored = sessionId ? getSessionById(sessionId) : null;
  return stored?.summaryText ? { status: 'ready', response: stored.summaryText } : { status: 'loading', response: '' };
}
