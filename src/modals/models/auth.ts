import type { Provider } from '../../domain/provider.js';
import { createProvider } from '../../providers/index.js';
import { THEME } from '../../shared/theme.js';
import type { ModalContext, ModalRenderContext } from '../types.js';
import {
  SPINNER_FRAMES,
  type ModelProviderDefinition,
  type ModelsModalState,
  type ProviderAuthById,
  type ProviderAuthStatus,
} from './state.js';

export async function checkProviderAuth(providers: ModelProviderDefinition[]): Promise<ProviderAuthById> {
  const entries = await Promise.all(
    providers.map(async provider => {
      const instance = createProvider(provider.id);

      if (!instance) {
        return [provider.id, { state: 'blocked', message: `${provider.label} is unavailable.` }] as const;
      }

      try {
        await instance.checkAuth();
        return [provider.id, { state: 'ready' }] as const;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return [provider.id, { state: 'blocked', message }] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as ProviderAuthById;
}

export function isProviderUsable(
  provider: ModelProviderDefinition,
  context: ModalRenderContext,
  auth: ProviderAuthById,
): boolean {
  const status = getAuthStatus(auth, provider.id);
  return (
    status.state === 'ready' &&
    (!provider.requiresKey || (context.config?.provider === provider.id && context.config.apiKey.trim().length > 0))
  );
}

export function getProviderStatus(
  provider: ModelProviderDefinition,
  context: ModalRenderContext,
  auth: ProviderAuthById,
): 'checking' | 'ready' | 'setup' | 'login' {
  const status = getAuthStatus(auth, provider.id);
  if (status.state === 'checking') return 'checking';
  if (status.state === 'blocked') return 'login';
  return isProviderUsable(provider, context, auth) ? 'ready' : 'setup';
}

export function getAuthStatus(auth: ProviderAuthById, provider: Provider): ProviderAuthStatus {
  return auth[provider] ?? { state: 'checking' };
}

export function getProviderStatusColor(status: 'checking' | 'ready' | 'setup' | 'login') {
  if (status === 'ready') return THEME.success;
  if (status === 'login') return THEME.danger;
  return THEME.primary;
}

export function createCheckingAuth(providers: ModelProviderDefinition[]): ProviderAuthById {
  return Object.fromEntries(providers.map(provider => [provider.id, { state: 'checking' }])) as ProviderAuthById;
}

export function startProviderAuthCheck(
  context: ModalContext,
  providers: ModelProviderDefinition[],
  authCheckId: string,
) {
  let spinnerFrame = 0;
  const interval = setInterval(() => {
    spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
    context.updateModal<ModelsModalState>(current => updateMatchingAuthState(current, authCheckId, { spinnerFrame }));
  }, 120);

  void checkProviderAuth(providers)
    .then(auth => {
      clearInterval(interval);
      context.updateModal<ModelsModalState>(current =>
        updateMatchingAuthState(current, authCheckId, { auth, spinnerFrame, error: undefined }),
      );
    })
    .catch(error => {
      clearInterval(interval);
      const message = error instanceof Error ? error.message : String(error);
      const auth = Object.fromEntries(
        providers.map(provider => [provider.id, { state: 'blocked', message }]),
      ) as ProviderAuthById;
      context.updateModal<ModelsModalState>(current =>
        updateMatchingAuthState(current, authCheckId, { auth, spinnerFrame }),
      );
    });
}

function updateMatchingAuthState(
  current: ModelsModalState,
  authCheckId: string,
  patch: Partial<Pick<ModelsModalState, 'auth' | 'spinnerFrame' | 'error'>>,
): ModelsModalState {
  if (current.authCheckId !== authCheckId) return current;

  return { ...current, ...patch };
}
