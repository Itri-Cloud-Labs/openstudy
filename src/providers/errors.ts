export const CONTEXT_OVERFLOW_MESSAGE =
  "The study material is too large for this model's context window. Try a model with a larger context limit, or use a shorter document.";

interface NormalizeProviderErrorOptions {
  authMessage?: string;
  fallbackMessage?: string;
  signal?: AbortSignal;
}

export function normalizeProviderError(error: unknown, options: NormalizeProviderErrorOptions = {}): Error {
  if (options.signal?.aborted || isAbortError(error)) {
    return createProviderAbortError(error);
  }

  const message = getProviderErrorMessage(
    error,
    options.fallbackMessage ?? 'An error occurred during the provider request.',
  );

  if (isContextOverflowError(message, error)) {
    return new Error(CONTEXT_OVERFLOW_MESSAGE);
  }

  if (options.authMessage && /auth|login|log in|unauthori[sz]ed/i.test(message)) {
    return new Error(options.authMessage);
  }

  return error instanceof Error && error.message === message ? error : new Error(message);
}

export function getProviderErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const nestedData = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : null;

    if (typeof nestedData?.message === 'string' && nestedData.message.trim()) return nestedData.message;
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (typeof record.name === 'string' && record.name.trim()) return record.name;
  }

  return fallbackMessage;
}

export function throwIfProviderAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw createProviderAbortError(signal.reason);
}

export function createProviderAbortError(reason?: unknown): Error {
  if (reason instanceof Error && reason.name === 'AbortError') return reason;

  const error = new Error(reason instanceof Error && reason.message ? reason.message : 'Provider request aborted.');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isContextOverflowError(message: string, error: unknown): boolean {
  if (
    /context[_ -]?(?:length|window).*?(?:exceed|limit|maximum|too (?:large|long))/i.test(message) ||
    /(?:exceed|maximum|limit|too (?:large|long)).*?context[_ -]?(?:length|window)/i.test(message) ||
    /(?:too many|maximum|exceed(?:ed|s)?).*?(?:input |prompt )?tokens?/i.test(message) ||
    /prompt (?:is )?too long/i.test(message)
  ) {
    return true;
  }
  if (!error || typeof error !== 'object') return false;

  return (error as Record<string, unknown>).name === 'ContextOverflowError';
}
