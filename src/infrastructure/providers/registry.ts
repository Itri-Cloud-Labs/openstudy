import type { ProviderMetadata, ProviderRegistration, StudyProvider } from './contracts.js';
import { normalizeProviderError } from './errors.js';

export class ProviderRegistry<
  TProviderId extends string,
  TProvider extends StudyProvider<TProviderId> = StudyProvider<TProviderId>,
> {
  readonly #registrations: ReadonlyMap<TProviderId, ProviderRegistration<TProviderId, TProvider>>;
  #disposePromise: Promise<void> | null = null;

  constructor(registrations: readonly ProviderRegistration<TProviderId, TProvider>[]) {
    const registrationsById = new Map<TProviderId, ProviderRegistration<TProviderId, TProvider>>();

    for (const registration of registrations) {
      if (registrationsById.has(registration.metadata.id)) {
        throw new Error(`Duplicate provider registration: ${registration.metadata.id}`);
      }

      registrationsById.set(registration.metadata.id, registration);
    }

    this.#registrations = registrationsById;
  }

  listMetadata(): ProviderMetadata<TProviderId>[] {
    return [...this.#registrations.values()].map(({ metadata }) => ({ ...metadata }));
  }

  getMetadata(id: string): ProviderMetadata<TProviderId> | null {
    const registration = this.#registrations.get(id as TProviderId);
    return registration ? { ...registration.metadata } : null;
  }

  create(id: TProviderId): TProvider;
  create(id: string): TProvider | null;
  create(id: string): TProvider | null {
    return this.#registrations.get(id as TProviderId)?.create() ?? null;
  }

  disposeAll(): Promise<void> {
    this.#disposePromise ??= this.#disposeRegistrations().finally(() => {
      this.#disposePromise = null;
    });

    return this.#disposePromise;
  }

  async #disposeRegistrations(): Promise<void> {
    let firstError: Error | null = null;

    for (const registration of this.#registrations.values()) {
      try {
        await registration.dispose();
      } catch (error) {
        firstError ??= normalizeProviderError(error, {
          fallbackMessage: `Failed to dispose ${registration.metadata.label}.`,
        });
      }
    }

    if (firstError) throw firstError;
  }
}
