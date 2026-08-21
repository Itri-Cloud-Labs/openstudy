import React from 'react';
import { Box, Text, useInput } from 'ink';
import { loadCommands, type CommandContext, type CommandModule } from '../commands/index.js';
import { LoadingScreen } from '../components/LoadingScreen.js';
import { SetupScreen } from '../components/SetupScreen.js';
import { HomeScreen } from '../features/home/HomeScreen.js';
import { SessionScreen } from '../features/study-session/SessionScreen.js';
import { getHomeDirectory, getWorkingDirectory } from '../infrastructure/runtime/environment.js';
import { useModalManager } from '../features/modals/useModalManager.js';
import { loadModalManifests } from '../modals/registry.js';
import type { ModalScreen, SelectedModel } from '../modals/types.js';
import { subjects, type SubjectOption } from '../options/index.js';
import { createProvider, getProviderDefinition } from '../providers/index.js';
import { useTerminalSize } from '../shared/hooks/useTerminalSize.js';
import { formatMaterialLabel, shortenHomePath } from '../shared/text.js';
import { useTerminalSurface } from '../shared/terminal/useTerminalSurface.js';
import { PROVIDERS, type Provider, type SessionSettings } from '../types/index.js';
import { loadSession, updateSettings } from '../utils/config.js';
import { createSession, setSession as setSavedSession } from '../utils/index.js';
import { isTerminalMouseReport } from '../utils/input.js';

const MIN_LOADING_MS = 350;
const FIRST_LAUNCH_LOADING_MS = 4000;
const MIN_WIDTH = 73;
const MIN_HEIGHT = 23;
const CONTENT_SIDE_PADDING = 3;
const PROMPT_MAX_WIDTH = 100;
const PROMPT_MAX_WIDTH_WIDE = 125;
const WIDE_TERMINAL_BREAKPOINT = 192;

const TIPS = [
  'Use tab to choose a subject.',
  'Use slash commands for setup, saved sessions, and exit.',
  'Type a topic and press enter to start a session.',
  'Attach study material before starting a focused session.',
];
const DEFAULT_TIP = 'Type a topic and press enter to start a session.';

export type AppRoute =
  | { screen: 'home' }
  | { screen: 'setup' }
  | { screen: 'session'; sessionId: string; prompt: string };

export interface AppProps {
  firstLaunch: boolean;
  onExit: () => void;
}

export function App({ firstLaunch, onExit }: AppProps) {
  const [route, setRoute] = React.useState<AppRoute>({ screen: 'home' });
  const [commands, setCommands] = React.useState<CommandModule[]>([]);
  const [preloadReady, setPreloadReady] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const startedAt = React.useRef(Date.now());

  React.useEffect(() => {
    let mounted = true;
    void Promise.all([loadCommands(), loadModalManifests()])
      .then(([loadedCommands]) => {
        if (mounted) setCommands(loadedCommands);
      })
      .catch(() => {
        if (mounted) setCommands([]);
      })
      .finally(() => {
        if (mounted) setPreloadReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!loading || !preloadReady) return;
    const minimum = firstLaunch ? FIRST_LAUNCH_LOADING_MS : MIN_LOADING_MS;
    const remaining = Math.max(0, minimum - (Date.now() - startedAt.current));
    const timer = setTimeout(() => setLoading(false), remaining);
    return () => clearTimeout(timer);
  }, [firstLaunch, loading, preloadReady]);

  if (route.screen === 'setup') return <SetupScreen onExit={onExit} />;

  return (
    <>
      <StudyWorkspace
        route={route}
        commands={commands}
        inputDisabled={loading}
        onExit={onExit}
        onRouteChange={setRoute}
      />
      {loading && <LoadingScreen firstLaunch={firstLaunch} preloadReady={preloadReady} />}
    </>
  );
}

interface StudyWorkspaceProps {
  route: Extract<AppRoute, { screen: 'home' | 'session' }>;
  commands: CommandModule[];
  inputDisabled: boolean;
  onExit: () => void;
  onRouteChange: (route: AppRoute) => void;
}

function StudyWorkspace({ route, commands, inputDisabled, onExit, onRouteChange }: StudyWorkspaceProps) {
  useTerminalSurface();
  const terminal = useTerminalSize();
  const [session, setSession] = React.useState<SessionSettings>(() => loadSession());
  const activeSessionId = route.screen === 'session' ? route.sessionId : null;
  const modalScreen: ModalScreen = route.screen === 'session' ? 'session' : 'home';
  const selectedSubject = React.useMemo<SubjectOption | null>(
    () =>
      subjects.find(subject => subject.name === session.subject) ?? subjects.find(subject => subject.default) ?? null,
    [session.subject],
  );
  const selectedModel = React.useMemo<SelectedModel | null>(
    () => (session.modelProvider && session.model ? { provider: session.modelProvider, name: session.model } : null),
    [session.model, session.modelProvider],
  );
  const config = React.useMemo(
    () => (session.provider ? { provider: session.provider, apiKey: session.apiKey } : null),
    [session.apiKey, session.provider],
  );

  const updateSession = React.useCallback((patch: Partial<SessionSettings>) => {
    const next = updateSettings(patch);
    setSession(next);
    return next;
  }, []);

  const activateSession = React.useCallback(
    (sessionId: string) => {
      const next = setSavedSession(sessionId);
      if (!next) return null;
      setSession(next);
      onRouteChange({
        screen: 'session',
        sessionId: next.sessionId ?? sessionId,
        prompt: getSessionPromptTitle(next),
      });
      return next;
    },
    [onRouteChange],
  );

  const isProviderConfigured = React.useCallback(
    (provider: Provider) => {
      const metadata = PROVIDERS.find(item => item.id === provider);
      if (!metadata || config?.provider !== provider) return false;
      return !metadata.requiresKey || config.apiKey.trim().length > 0;
    },
    [config],
  );

  const modalManager = useModalManager({
    screen: modalScreen,
    session,
    activeSessionId,
    config,
    selectedSubject,
    selectedModel,
    updateSettings: updateSession,
    setSession: activateSession,
    isProviderConfigured,
  });

  useInput((input, key) => {
    if (inputDisabled || isTerminalMouseReport(input)) return;

    if (modalManager.modal) {
      const handled =
        modalManager.modal.module.handleInput?.({
          input,
          key,
          modal: modalManager.modal.state,
          context: modalManager.context,
        }) ?? false;
      if (handled) return;
      if (key.ctrl && input === 'c') modalManager.close();
      return;
    }

    if (key.ctrl && input === 'c') onExit();
  });

  const commandContext = React.useMemo<CommandContext>(
    () => ({
      onExit,
      onSetup: () => onRouteChange({ screen: 'setup' }),
      openModal: modalManager.open,
      closeModal: modalManager.close,
    }),
    [modalManager.close, modalManager.open, onExit, onRouteChange],
  );

  const selectedModelLabel = selectedModel
    ? `${getProviderDefinition(selectedModel.provider)?.label ?? selectedModel.provider}/${selectedModel.name}`
    : 'Provider/Model';
  const selectedProviderLabel = selectedModel
    ? (getProviderDefinition(selectedModel.provider)?.label ?? selectedModel.provider)
    : 'Provider';
  const reasoningLabel = session.reasoningEffort ?? 'Default';
  const materialLabel = formatMaterialLabel(session.material);
  const languageLabel = session.studyLanguage ?? 'Study Language';
  const cwd = shortenHomePath(getWorkingDirectory(), getHomeDirectory());
  const tip = React.useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)] ?? DEFAULT_TIP, []);

  const handleHomeSubmit = React.useCallback(
    (value: string) => {
      if (!hasCompleteSessionOptions(session, selectedSubject, selectedModel)) return;
      const created = createSession({ ...session, title: null, summaryText: null });
      if (!created.sessionId) return;
      onRouteChange({ screen: 'session', sessionId: created.sessionId, prompt: value.trim() });
    },
    [onRouteChange, selectedModel, selectedSubject, session],
  );

  if (terminal.width < MIN_WIDTH || terminal.height < MIN_HEIGHT) {
    return <TerminalTooSmall width={terminal.width} height={terminal.height} />;
  }

  const promptMaxWidth = terminal.width >= WIDE_TERMINAL_BREAKPOINT ? PROMPT_MAX_WIDTH_WIDE : PROMPT_MAX_WIDTH;
  const promptWidth = Math.max(1, Math.min(terminal.width - CONTENT_SIDE_PADDING * 2, promptMaxWidth));
  const inputActive = !modalManager.modal && !inputDisabled;

  if (route.screen === 'session') {
    return (
      <SessionScreen
        termWidth={terminal.width}
        termHeight={terminal.height}
        prompt={route.prompt}
        subject={selectedSubject?.name ?? 'Subject'}
        subjectColor={selectedSubject?.color ?? '#3b82f6'}
        modelProvider={selectedModel?.provider ?? null}
        provider={selectedProviderLabel}
        model={selectedModel?.name ?? selectedModelLabel}
        reasoningEffort={reasoningLabel}
        material={materialLabel}
        materialPath={session.material ?? ''}
        studyLanguage={languageLabel}
        sessionId={route.sessionId}
        cwd={cwd}
        commands={commands}
        commandContext={commandContext}
        inputActive={inputActive}
        modal={modalManager.modal}
        modalContext={modalManager.context}
        modalTriggers={modalManager.triggers}
        onModalTrigger={modalManager.executeTrigger}
      />
    );
  }

  return (
    <HomeScreen
      width={terminal.width}
      height={terminal.height}
      promptWidth={promptWidth}
      presentation={{
        subject: selectedSubject?.name ?? 'Subject',
        subjectColor: selectedSubject?.color ?? '#3b82f6',
        model: selectedModelLabel,
        reasoningEffort: reasoningLabel,
        material: materialLabel,
        studyLanguage: languageLabel,
        cwd,
        tip,
      }}
      input={{
        commands,
        commandContext,
        active: inputActive,
        triggers: modalManager.triggers,
        onTrigger: modalManager.executeTrigger,
        onSubmit: handleHomeSubmit,
      }}
      overlay={{ modal: modalManager.modal, context: modalManager.context }}
    />
  );
}

function TerminalTooSmall({ width, height }: { width: number; height: number }) {
  return (
    <Box
      width={width}
      height={height}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor="#000000"
    >
      <Text color="#f0a500" bold>
        Terminal too small
      </Text>
      <Text color="#555555">
        {width}×{height}
        {'  '}
        <Text color="#888888">minimum </Text>
        {MIN_WIDTH}×{MIN_HEIGHT}
      </Text>
      <Text color="#3d3d3d">Resize your terminal window to continue.</Text>
    </Box>
  );
}

function hasCompleteSessionOptions(
  session: SessionSettings,
  selectedSubject: SubjectOption | null,
  selectedModel: SelectedModel | null,
): boolean {
  return Boolean(
    selectedSubject &&
      selectedModel &&
      (!modelRequiresReasoning(selectedModel) || session.reasoningEffort) &&
      session.material &&
      session.studyLanguage,
  );
}

function modelRequiresReasoning(selectedModel: SelectedModel): boolean {
  const provider = createProvider(selectedModel.provider);
  const option = provider?.GetModels().find(model => model.model === selectedModel.name);
  return Boolean(option && option.reasoningLevels.length > 0);
}

function getSessionPromptTitle(session: SessionSettings): string {
  const title = session.title?.trim();
  if (title) return title;
  const material = formatMaterialLabel(session.material);
  return material === 'Material' ? 'Study Session' : material;
}
