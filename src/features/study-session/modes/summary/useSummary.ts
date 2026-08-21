import React from 'react';
import { materialService, type ResolvedMaterial } from '../../../../infrastructure/materials/index.js';
import { createProvider } from '../../../../providers/index.js';
import type { Provider } from '../../../../types/index.js';
import { getSessionById, saveSessionById } from '../../../../utils/index.js';
import { truncate } from '../../../../shared/text.js';
import { generateSummary } from './generate-summary.js';

export const SUMMARY_LOADING_STEPS = [
  'Checking session inputs',
  'Resolving material path',
  'Preparing request',
  'Checking login',
  'Starting session',
  'Waiting for structured response',
  'Waiting for response',
  'Analyzing key ideas',
] as const;

export type SummaryState =
  | { status: 'loading'; step: string }
  | { status: 'streaming'; response: string }
  | { status: 'ready'; response: string }
  | { status: 'error'; error: string };

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
  const { sessionId, prompt, modelProvider, model, materialPath, studyLanguage, reasoningEffort } = options;
  const [title, setTitle] = React.useState(truncate(prompt, 50));
  const [summaryState, setSummaryState] = React.useState<SummaryState>(() => initialState(sessionId));

  React.useEffect(() => {
    if (!sessionId) {
      setSummaryState({ status: 'error', error: 'No active session was created.' });
      return;
    }

    const storedSession = getSessionById(sessionId);
    if (storedSession?.summaryText) {
      setSummaryState({ status: 'ready', response: storedSession.summaryText });
      setTitle(storedSession.title ?? truncate(prompt, 50));
      return;
    }
    if (!modelProvider || !model) {
      setSummaryState({ status: 'error', error: 'No model is selected for this session.' });
      return;
    }
    if (!materialPath) {
      setSummaryState({ status: 'error', error: 'No study material is attached to this session.' });
      return;
    }

    setSummaryState({ status: 'loading', step: 'Resolving material path' });
    let material: ResolvedMaterial;
    try {
      material = materialService.resolve(materialPath);
    } catch {
      setSummaryState({ status: 'error', error: 'The selected study material could not be found.' });
      return;
    }

    const provider = createProvider(modelProvider);
    if (!provider) {
      setSummaryState({ status: 'error', error: 'The selected provider is unavailable.' });
      return;
    }

    const controller = new AbortController();
    setSummaryState({ status: 'loading', step: 'Preparing request' });

    void (async () => {
      try {
        for await (const event of generateSummary({
          provider,
          model,
          reasoningEffort,
          material,
          studyLanguage,
          signal: controller.signal,
        })) {
          if (controller.signal.aborted) return;
          if (event.type === 'status') {
            setSummaryState({ status: 'loading', step: event.step });
            continue;
          }
          if (event.type === 'partial') {
            setTitle(truncate(event.summary.SessionTitle, 50));
            setSummaryState({ status: 'streaming', response: event.summary.content });
            continue;
          }

          const current = getSessionById(sessionId);
          if (current) {
            saveSessionById(sessionId, {
              ...current,
              title: event.summary.SessionTitle,
              summaryText: event.summary.content,
            });
          }
          setTitle(truncate(event.summary.SessionTitle, 50));
          setSummaryState({ status: 'ready', response: event.summary.content });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSummaryState({ status: 'error', error: error instanceof Error ? error.message : String(error) });
        }
      }
    })();

    return () => controller.abort();
  }, [materialPath, model, modelProvider, prompt, reasoningEffort, sessionId, studyLanguage]);

  return { summaryState, title };
}

function initialState(sessionId: string | null): SummaryState {
  const stored = sessionId ? getSessionById(sessionId) : null;
  return stored?.summaryText
    ? { status: 'ready', response: stored.summaryText }
    : { status: 'loading', step: SUMMARY_LOADING_STEPS[0] };
}
