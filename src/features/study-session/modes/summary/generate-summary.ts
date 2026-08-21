import type { AIProvider } from '../../../../providers/index.js';
import { summarySystemPrompt } from '../../../../prompts/summary.js';
import type { ResolvedMaterial } from '../../../../infrastructure/materials/index.js';
import { parseSummaryPayload, type SummaryPayload } from './summary-payload.js';

export const SUMMARY_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    SessionTitle: { type: 'string' },
    content: { type: 'string' },
  },
  required: ['SessionTitle', 'content'],
  additionalProperties: false,
} as const;

export interface GenerateSummaryRequest {
  provider: AIProvider;
  model: string;
  reasoningEffort?: string;
  material: ResolvedMaterial;
  studyLanguage: string;
  signal?: AbortSignal;
}

export type SummaryGenerationEvent =
  | { type: 'status'; step: string }
  | { type: 'partial'; summary: SummaryPayload }
  | { type: 'complete'; summary: SummaryPayload };

export async function* generateSummary(request: GenerateSummaryRequest): AsyncGenerator<SummaryGenerationEvent> {
  let latestResponse = '';
  let latestSummary: SummaryPayload | null = null;

  for await (const event of request.provider.Prompt(buildSummaryUserPrompt(request.studyLanguage), {
    system: summarySystemPrompt,
    model: request.model,
    reasoningEffort: request.reasoningEffort,
    signal: request.signal,
    workingDirectory: request.material.workingDirectory,
    file: request.material.location,
    responseSchema: SUMMARY_RESPONSE_SCHEMA,
  })) {
    if (request.signal?.aborted) return;

    if (event.type === 'status') {
      if (!latestResponse) yield { type: 'status', step: event.text };
      continue;
    }

    latestResponse = event.text;
    const parsed = parseSummaryPayload(latestResponse);
    if (!parsed?.content) continue;

    latestSummary = parsed;
    yield { type: 'partial', summary: parsed };
  }

  if (request.signal?.aborted) return;
  const complete = parseSummaryPayload(latestResponse) ?? latestSummary;
  if (!complete?.content) throw new Error('No summary was generated.');
  yield { type: 'complete', summary: complete };
}

export function buildSummaryUserPrompt(language: string): string {
  return [
    'Summarize the attached study material into structured study notes.',
    '',
    'Return a JSON object with exactly these fields:',
    '- SessionTitle: a short session title',
    '- content: the full summary in Markdown',
    '',
    'IMPORTANT: Output raw JSON only. Do not wrap in markdown code fences or backticks. Do not include any explanation before or after the JSON object.',
    '',
    'Requirements for content:',
    '',
    `The summary MUST be written in: ${language}`,
    'Format the content value in clean Markdown',
    'Use clear headings (##, ###) and subheadings',
    'Use bullet points for readability',
    'Keep all important ideas and concepts',
    'Simplify explanations where needed',
    'Keep it concise but complete',
    'At the end, add a section called Key Points to Remember',
    'List the most important facts or ideas to memorize',
  ].join('\n');
}
