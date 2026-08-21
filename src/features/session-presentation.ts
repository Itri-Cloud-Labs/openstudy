import React from 'react';
import type { Provider } from '../domain/provider.js';
import { materialRefToLegacy } from '../domain/material.js';
import type { AppPreferences } from '../domain/study.js';
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
}

export interface SessionSelectionAndPresentation extends SessionSelection {
  presentation: SessionPresentation;
}

export function useSessionSelection(preferences: AppPreferences): SessionSelectionAndPresentation {
  const selectedSubject = React.useMemo<SubjectOption | null>(
    () =>
      subjects.find(subject => subject.name === preferences.subject) ??
      subjects.find(subject => subject.default) ??
      null,
    [preferences.subject],
  );
  const selectedModel = React.useMemo<SelectedModel | null>(
    () =>
      preferences.modelProvider && preferences.model
        ? { provider: preferences.modelProvider, name: preferences.model }
        : null,
    [preferences.model, preferences.modelProvider],
  );

  const presentation = React.useMemo<SessionPresentation>(() => {
    const modelLabel = selectedModel
      ? `${getProviderLabel(selectedModel.provider)}/${selectedModel.name}`
      : 'Provider/Model';
    const materialPath = materialRefToLegacy(preferences.material);
    return {
      subject: selectedSubject?.name ?? 'Subject',
      subjectColor: selectedSubject?.color ?? '#3b82f6',
      provider: selectedModel ? getProviderLabel(selectedModel.provider) : 'Provider',
      modelProvider: selectedModel?.provider ?? null,
      model: selectedModel?.name ?? 'Model',
      modelLabel,
      reasoningEffort: preferences.reasoningEffort ?? 'Default',
      material: formatMaterialLabel(materialPath),
      materialPath: materialPath ?? '',
      studyLanguage: preferences.studyLanguage ?? 'Study Language',
      cwd: shortenHomePath(getWorkingDirectory(), getHomeDirectory()),
    };
  }, [selectedModel, selectedSubject, preferences]);

  return { selectedSubject, selectedModel, presentation };
}

function getProviderLabel(provider: Provider): string {
  return PROVIDER_METADATA.find(metadata => metadata.id === provider)?.label ?? provider;
}
