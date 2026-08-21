import React from 'react';
import { Box, Text, useInput } from 'ink';
import { loadCommands, type CommandContext, type CommandModule } from '../commands/index.js';
import type { ActiveProviderConfig, Provider } from '../domain/provider.js';
import { materialRefToLegacy } from '../domain/material.js';
import type { AppPreferences, StudySession } from '../domain/study.js';
import { useSessionSelection } from '../features/session-presentation.js';
import { HomeScreen } from '../features/home/HomeScreen.js';
import { SetupScreen } from '../features/setup/SetupScreen.js';
import { SessionScreen } from '../features/study-session/SessionScreen.js';
import { useModalManager } from '../features/modals/useModalManager.js';
import { loadModalManifests } from '../modals/registry.js';
import type { ModalScreen, SelectedModel } from '../modals/types.js';
import type { SubjectOption } from '../options/index.js';
import { createProvider, PROVIDER_METADATA } from '../providers/index.js';
import { useTerminalSize } from '../shared/hooks/useTerminalSize.js';
import { formatMaterialLabel } from '../shared/text.js';
import { THEME } from '../shared/theme.js';
import { useTerminalSurface } from '../shared/terminal/useTerminalSurface.js';
import { LoadingScreen } from '../shared/ui/LoadingScreen.js';
import { loadAppPreferences, loadConfig, saveConfig, updatePreferences } from '../utils/config.js';
import { activateSession as activateSavedSession, createSession } from '../utils/sessions.js';
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
  const [preferences, setPreferences] = React.useState<AppPreferences>(() => loadAppPreferences());
  const [config, setConfig] = React.useState<ActiveProviderConfig | null>(() => loadConfig());
  const activeSessionId = route.screen === 'session' ? route.sessionId : null;
  const modalScreen: ModalScreen = route.screen === 'session' ? 'session' : 'home';
  const { selectedSubject, selectedModel, presentation } = useSessionSelection(preferences);

  // Probe the configured provider once per run so model and reasoning pickers
  // are populated from the harness before the models modal is opened.
  const warmedProviderRef = React.useRef<Provider | null>(null);
  React.useEffect(() => {
    const providerId = preferences.modelProvider;
    if (!providerId || warmedProviderRef.current === providerId) return;
    warmedProviderRef.current = providerId;
    const instance = createProvider(providerId);
    if (!instance) return;
    void instance.checkAuth().catch(() => undefined);
  }, [preferences.modelProvider]);

  const handleUpdatePreferences = React.useCallback((patch: Partial<AppPreferences>) => {
    const next = updatePreferences(patch);
    setPreferences(next);
    return next;
  }, []);

  const handleSaveProviderConfig = React.useCallback((next: ActiveProviderConfig) => {
    saveConfig(next);
    setConfig(next);
  }, []);

  const activateSession = React.useCallback(
    (sessionId: string) => {
      const activated = activateSavedSession(sessionId);
      if (!activated) return null;
      onRouteChange({
        screen: 'session',
        sessionId,
        prompt: getSessionPromptTitle(activated),
      });
      return activated;
    },
    [onRouteChange],
  );

  const isProviderConfigured = React.useCallback(
    (provider: Provider) => {
      const metadata = PROVIDER_METADATA.find(item => item.id === provider);
      if (!metadata || config?.provider !== provider) return false;
      return !metadata.requiresKey || config.apiKey.trim().length > 0;
    },
    [config],
  );

  const modalManager = useModalManager({
    screen: modalScreen,
    preferences,
    activeSessionId,
    config,
    selectedSubject,
    selectedModel,
    updatePreferences: handleUpdatePreferences,
    saveProviderConfig: handleSaveProviderConfig,
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

  const tip = React.useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)] ?? DEFAULT_TIP, []);

  const handleHomeSubmit = React.useCallback(
    (value: string) => {
      if (!hasCompleteSessionOptions(preferences, selectedSubject, selectedModel)) return;
      const created = createSession(preferences);
      onRouteChange({ screen: 'session', sessionId: created.id, prompt: value.trim() });
    },
    [onRouteChange, selectedModel, selectedSubject, preferences],
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
        sessionId={route.sessionId}
        presentation={presentation}
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
      presentation={{ ...presentation, tip }}
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
      backgroundColor={THEME.background}
    >
      <Text color={THEME.primary} bold>
        Terminal too small
      </Text>
      <Text color={THEME.textFaint}>
        {width}×{height}
        {'  '}
        <Text color={THEME.textMuted}>minimum </Text>
        {MIN_WIDTH}×{MIN_HEIGHT}
      </Text>
      <Text color={THEME.textFaint}>Resize your terminal window to continue.</Text>
    </Box>
  );
}

function hasCompleteSessionOptions(
  preferences: AppPreferences,
  selectedSubject: SubjectOption | null,
  selectedModel: SelectedModel | null,
): boolean {
  return Boolean(
    selectedSubject &&
      selectedModel &&
      (!modelRequiresReasoning(selectedModel) || preferences.reasoningEffort) &&
      preferences.material &&
      preferences.studyLanguage,
  );
}

function modelRequiresReasoning(selectedModel: SelectedModel): boolean {
  const provider = createProvider(selectedModel.provider);
  const option = provider?.getModels().find(model => model.model === selectedModel.name);
  return Boolean(option && option.reasoningLevels.length > 0);
}

function getSessionPromptTitle(session: StudySession): string {
  const title = session.title?.trim();
  if (title) return title;
  const material = formatMaterialLabel(materialRefToLegacy(session.preferences.material));
  return material === 'Material' ? 'Study Session' : material;
}
