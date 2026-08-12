import fs from 'fs';
import path from 'path';
import React from 'react';
import { createProvider } from '../providers/index.js';
import { summarySystemPrompt } from '../prompts/summary.js';
import type { Provider } from '../types/index.js';
import { getSessionById, saveSessionById } from '../utils/index.js';
import { parseSummaryPayload } from './summaryPayload.js';

export { parseSummaryPayload } from './summaryPayload.js';

export const SUMMARY_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    SessionTitle: { type: 'string' },
    content: { type: 'string' },
  },
  required: ['SessionTitle', 'content'],
  additionalProperties: false,
} as const;

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

interface UseSummaryOptions {
  sessionId: string | null;
  prompt: string;
  modelProvider: Provider | null;
  model: string | null;
  reasoningEffort: string;
  materialPath: string;
  studyLanguage: string;
}

export function useSummary({
  sessionId,
  prompt,
  modelProvider,
  model,
  reasoningEffort,
  materialPath,
  studyLanguage,
}: UseSummaryOptions) {
  const [title, setTitle] = React.useState(truncate(prompt, 50));
  const [summaryState, setSummaryState] = React.useState<SummaryState>(() => {
    const storedSession = sessionId ? getSessionById(sessionId) : null;
    return storedSession?.summaryText
      ? { status: 'ready', response: storedSession.summaryText }
      : { status: 'loading', step: SUMMARY_LOADING_STEPS[0] };
  });

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

    setSummaryState({ status: 'loading', step: 'Checking session inputs' });

    if (!modelProvider || !model) {
      setSummaryState({ status: 'error', error: 'No model is selected for this session.' });
      return;
    }

    if (!materialPath) {
      setSummaryState({ status: 'error', error: 'No study material is attached to this session.' });
      return;
    }

    setSummaryState({ status: 'loading', step: 'Resolving material path' });

    const resolvedMaterialPath = resolveMaterialPath(materialPath);
    if (!resolvedMaterialPath) {
      setSummaryState({ status: 'error', error: 'The selected study material could not be found.' });
      return;
    }

    const selectedProvider = createProvider(modelProvider);
    if (!selectedProvider) {
      setSummaryState({ status: 'error', error: 'The selected provider is unavailable.' });
      return;
    }

    const controller = new AbortController();
    const workingDirectory = isUrl(resolvedMaterialPath) ? undefined : path.dirname(resolvedMaterialPath);

    setSummaryState({ status: 'loading', step: 'Preparing request' });

    const runSummary = async () => {
      try {
        let latestResponse = '';

        setSummaryState({ status: 'loading', step: 'Checking login' });

        for await (const event of selectedProvider.Prompt(buildSummaryUserPrompt(studyLanguage), {
          system: summarySystemPrompt,
          model,
          reasoningEffort,
          signal: controller.signal,
          workingDirectory,
          file: resolvedMaterialPath,
          responseSchema: SUMMARY_RESPONSE_SCHEMA,
        })) {
          if (controller.signal.aborted) return;

          if (event.type === 'status') {
            if (!latestResponse) setSummaryState({ status: 'loading', step: event.text });
            continue;
          }

          latestResponse = event.text;
          saveParsedSummary(sessionId, latestResponse, 'streaming', setSummaryState, setTitle);
        }

        if (!controller.signal.aborted && !saveParsedSummary(sessionId, latestResponse, 'ready', setSummaryState, setTitle)) {
          setSummaryState({ status: 'error', error: 'No summary was generated.' });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSummaryState({
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    void runSummary();

    return () => {
      controller.abort();
    };
  }, [materialPath, model, modelProvider, prompt, reasoningEffort, sessionId, studyLanguage]);

  return { summaryState, title };
}

export function buildSummaryUserPrompt(language: string) {
  return `Summarize the attached study material into structured study notes.\n\nReturn a JSON object with exactly these fields:\n- SessionTitle: a short session title\n- content: the full summary in Markdown\n\nIMPORTANT: Output raw JSON only. Do not wrap in markdown code fences or backticks. Do not include any explanation before or after the JSON object.\n\nRequirements for content:\n\nThe summary MUST be written in: ${language}\nFormat the content value in clean Markdown\nUse clear headings (##, ###) and subheadings\nUse bullet points for readability\nKeep all important ideas and concepts\nSimplify explanations where needed\nKeep it concise but complete\nAt the end, add a section called Key Points to Remember\nList the most important facts or ideas to memorize`;
}

function saveParsedSummary(
  sessionId: string,
  response: string,
  status: 'streaming' | 'ready',
  setSummaryState: React.Dispatch<React.SetStateAction<SummaryState>>,
  setTitle: React.Dispatch<React.SetStateAction<string>>,
) {
  const parsedSummary = parseSummaryPayload(response);
  if (!parsedSummary?.content) return false;

  const storedSession = getSessionById(sessionId);
  if (storedSession) {
    saveSessionById(sessionId, {
      ...storedSession,
      title: parsedSummary.SessionTitle,
      summaryText: parsedSummary.content,
    });
  }

  const refreshedSession = getSessionById(sessionId);
  if (!refreshedSession?.summaryText) return false;

  setTitle(refreshedSession.title ?? truncate(parsedSummary.SessionTitle, 50));
  setSummaryState({ status, response: refreshedSession.summaryText });
  return true;
}

function resolveMaterialPath(materialPath: string) {
  if (isUrl(materialPath)) return materialPath;
  return fs.existsSync(materialPath) ? materialPath : null;
}

function isUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://');
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
