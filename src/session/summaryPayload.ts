export interface SummaryPayload {
  SessionTitle: string;
  content: string;
}

export function parseSummaryPayload(response: string): SummaryPayload | null {
  let normalizedResponse = response.trim();
  if (!normalizedResponse) return null;

  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/u.exec(normalizedResponse);
  if (fenceMatch?.[1]) normalizedResponse = fenceMatch[1].trim();

  try {
    const parsed = JSON.parse(normalizedResponse) as unknown;
    return looksLikeSummaryPayload(parsed) ? parsed : null;
  } catch {
    return extractPartialSummaryPayload(normalizedResponse);
  }
}

function looksLikeSummaryPayload(value: unknown): value is SummaryPayload {
  return typeof value === 'object'
    && value !== null
    && 'SessionTitle' in value
    && typeof value.SessionTitle === 'string'
    && 'content' in value
    && typeof value.content === 'string';
}

function extractPartialSummaryPayload(response: string): SummaryPayload | null {
  const titleMatch = /"SessionTitle"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)/u.exec(response);
  const contentMatch = /"content"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)/u.exec(response);
  if (!titleMatch || !contentMatch) return null;

  return {
    SessionTitle: decodePartialJsonString(titleMatch[1] ?? ''),
    content: decodePartialJsonString(contentMatch[1] ?? ''),
  };
}

function decodePartialJsonString(value: string) {
  let index = 0;
  let content = '';

  while (index < value.length) {
    const character = value[index];

    if (character !== '\\') {
      content += character;
      index += 1;
      continue;
    }

    const nextCharacter = value[index + 1];
    if (!nextCharacter) return content;

    if (nextCharacter === 'n') {
      content += '\n';
      index += 2;
      continue;
    }

    if (nextCharacter === 'r') {
      content += '\r';
      index += 2;
      continue;
    }

    if (nextCharacter === 't') {
      content += '\t';
      index += 2;
      continue;
    }

    if (nextCharacter === '"' || nextCharacter === '\\' || nextCharacter === '/') {
      content += nextCharacter;
      index += 2;
      continue;
    }

    if (nextCharacter === 'b') {
      content += '\b';
      index += 2;
      continue;
    }

    if (nextCharacter === 'f') {
      content += '\f';
      index += 2;
      continue;
    }

    if (nextCharacter === 'u') {
      const unicodeHex = value.slice(index + 2, index + 6);
      if (/^[0-9a-fA-F]{4}$/u.test(unicodeHex)) {
        content += String.fromCharCode(Number.parseInt(unicodeHex, 16));
        index += 6;
        continue;
      }

      return content;
    }

    content += nextCharacter;
    index += 2;
  }

  return content;
}
