import React from 'react';
import type { ActiveProviderConfig, Provider } from '../domain/provider.js';
import type { SessionSettings } from '../domain/study.js';
import { getHomeDirectory, getWorkingDirectory } from '../infrastructure/runtime/environment.js';
import type { SelectedModel } from '../modals/types.js';
import { subjects, type SubjectOption } from '../options/index.js';
import { PROVIDER_METADATA } from '../providers/index.js';
import { formatMaterialLabel, shortenHomePath } from '../shared/text.js';

export interface SessionPresentation {
  subject: string;
  subjectColor: string;
  provider: string;
  modelProvider: Provider | null;
  /** Bare model name, e.g. `gpt-5.5`. */
  model: string;
  /** Provider-qualified label, e.g. `Codex/gpt-5.5`. */
  modelLabel: string;
  reasoningEffort: string;
  material: string;
  materialPath: string;
  studyLanguage: string;
  cwd: string;
}

export interface SessionSelection {
  selectedSubject: SubjectOption | null;
  selectedModel: SelectedModel | null;
  config: ActiveProviderConfig | null;
}

export interface SessionSelectionAndPresentation extends SessionSelection {
  presentation: SessionPresentation;
}

export function useSessionSelection(session: SessionSettings): SessionSelectionAndPresentation {
  const selectedSubject = React.useMemo<SubjectOption | null>(
    () =>
      subjects.find(subject => subject.name === session.subject) ?? subjects.find(subject => subject.default) ?? null,
    [session.subject],
  );
  const selectedModel = React.useMemo<SelectedModel | null>(
    () => (session.modelProvider && session.model ? { provider: session.modelProvider, name: session.model } : null),
    [session.model, session.modelProvider],
  );
  const config = React.useMemo<ActiveProviderConfig | null>(
    () => (session.provider ? { provider: session.provider, apiKey: session.apiKey } : null),
    [session.apiKey, session.provider],
  );

  const presentation = React.useMemo<SessionPresentation>(() => {
    const modelLabel = selectedModel
      ? `${getProviderLabel(selectedModel.provider)}/${selectedModel.name}`
      : 'Provider/Model';
    return {
      subject: selectedSubject?.name ?? 'Subject',
      subjectColor: selectedSubject?.color ?? '#3b82f6',
      provider: selectedModel ? getProviderLabel(selectedModel.provider) : 'Provider',
      modelProvider: selectedModel?.provider ?? null,
      model: selectedModel?.name ?? 'Model',
      modelLabel,
      reasoningEffort: session.reasoningEffort ?? 'Default',
      material: formatMaterialLabel(session.material),
      materialPath: session.material ?? '',
      studyLanguage: session.studyLanguage ?? 'Study Language',
      cwd: shortenHomePath(getWorkingDirectory(), getHomeDirectory()),
    };
  }, [selectedModel, selectedSubject, session.material, session.reasoningEffort, session.studyLanguage]);

  return { selectedSubject, selectedModel, config, presentation };
}

function getProviderLabel(provider: Provider): string {
  return PROVIDER_METADATA.find(metadata => metadata.id === provider)?.label ?? provider;
}
