import type { ResolvedMaterial } from '../../../../infrastructure/materials/index.js';
import type { StudyProvider } from '../../../../providers/index.js';
import { summarySystemPrompt } from '../../../../prompts/summary.js';
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
  provider: StudyProvider;
  model: string;
  reasoningEffort?: string;
  material: ResolvedMaterial;
  studyLanguage: string;
  signal?: AbortSignal;
}

export async function generateSummary(request: GenerateSummaryRequest): Promise<SummaryPayload> {
  const { text } = await request.provider.prompt(buildSummaryUserPrompt(request.studyLanguage), {
    system: summarySystemPrompt,
    model: request.model,
    reasoningEffort: request.reasoningEffort,
    signal: request.signal,
    workingDirectory: request.material.workingDirectory,
    file: request.material.location,
    responseSchema: SUMMARY_RESPONSE_SCHEMA,
  });

  const summary = parseSummaryPayload(text);
  if (!summary?.content) throw new Error('No summary was generated.');
  return summary;
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
