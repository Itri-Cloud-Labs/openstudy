import React from 'react';
import { TextAttributes } from '@opentui/core';
import { ProviderSelector } from './ProviderSelector.js';
import { ApiKeyInput } from './ApiKeyInput.js';
import { saveConfig, CONFIG_FILE } from '../../utils/config.js';
import type { Provider } from '../../domain/provider.js';
import { PROVIDER_METADATA } from '../../providers/index.js';
import { useAppKeys } from '../../shared/terminal/keymap.js';

type Step = 'welcome' | 'provider' | 'apikey' | 'saving' | 'done';

// ─── Layout helpers ────────────────────────────────────────────────────────────

const Divider = () => (
  <text fg={THEME_MUTED} attributes={TextAttributes.DIM}>
    {'─'.repeat(42)}
  </text>
);

const SetupLogo = () => (
  <box style={{ flexDirection: 'column', marginBottom: 1 }}>
    <text fg="#ffffff" attributes={TextAttributes.BOLD}>
      OpenStudy CLI
    </text>
    <text fg="#808080">AI-powered study assistant</text>
    <box style={{ marginTop: 1, flexDirection: 'column' }}>
      <text fg={THEME_MUTED} attributes={TextAttributes.DIM}>
        Implemented by Itri Cloud Labs
      </text>
      <text fg={THEME_MUTED} attributes={TextAttributes.DIM}>
        Powered by Itri Cloud
      </text>
    </box>
  </box>
);

const THEME_MUTED = '#808080';

// ─── Welcome step ──────────────────────────────────────────────────────────────

interface WelcomeStepProps {
  onContinue: () => void;
}

const WelcomeStep = ({ onContinue }: WelcomeStepProps) => {
  useAppKeys(({ input, key }) => {
    if (key.return || input === ' ') onContinue();
  });

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1 }}>
      <text fg="#ffffff" attributes={TextAttributes.BOLD}>
        {"Welcome! Let's set up your environment."}
      </text>
      <text fg={THEME_MUTED} attributes={TextAttributes.DIM}>
        This wizard will configure your AI provider and API key.
      </text>
      <text fg={THEME_MUTED} attributes={TextAttributes.DIM}>
        Press enter to begin…
      </text>
    </box>
  );
};

// ─── Saving step ───────────────────────────────────────────────────────────────

interface SavingStepProps {
  provider: Provider;
  apiKey: string;
  onDone: () => void;
}

const SavingStep = ({ provider, apiKey, onDone }: SavingStepProps) => {
  React.useEffect(() => {
    saveConfig({ provider, apiKey });
    const t = setTimeout(onDone, 600);
    return () => clearTimeout(t);
  }, [apiKey, onDone, provider]);

  return <text fg="#e5c07b">Saving configuration…</text>;
};

// ─── Done step ─────────────────────────────────────────────────────────────────

interface DoneStepProps {
  provider: Provider;
  onExit: () => void;
}

const DoneStep = ({ provider, onExit }: DoneStepProps) => {
  const label = PROVIDER_METADATA.find(p => p.id === provider)?.label ?? provider;

  useAppKeys(({ input, key }) => {
    if (input === 'q' || key.escape || (key.ctrl && input === 'c')) {
      onExit();
    }
  });

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1 }}>
      <text fg="#7fd88f" attributes={TextAttributes.BOLD}>
        ✓ Setup complete!
      </text>
      <text>
        <span fg="#ffffff">Provider: </span>
        <span fg="#56b6c2">{label}</span>
      </text>
      <text fg={THEME_MUTED} attributes={TextAttributes.DIM}>
        {`Config saved to ${CONFIG_FILE}`}
      </text>
      <box style={{ marginTop: 1 }}>
        <text fg="#ffffff">You can now start using OpenStudy CLI.</text>
      </box>
      <text fg={THEME_MUTED} attributes={TextAttributes.DIM}>
        Press q or esc to exit.
      </text>
    </box>
  );
};

// ─── SetupScreen ───────────────────────────────────────────────────────────────

interface SetupScreenProps {
  onExit: () => void;
}

export const SetupScreen = ({ onExit }: SetupScreenProps) => {
  const [step, setStep] = React.useState<Step>('welcome');
  const [provider, setProvider] = React.useState<Provider | null>(null);
  const [apiKey, setApiKey] = React.useState('');

  const providerMeta = provider ? PROVIDER_METADATA.find(p => p.id === provider) : null;

  const handleProviderSelect = (selected: Provider) => {
    setProvider(selected);
    const meta = PROVIDER_METADATA.find(p => p.id === selected);
    setStep(meta?.requiresKey ? 'apikey' : 'saving');
  };

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setStep('saving');
  };

  return (
    <box style={{ flexDirection: 'column', paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 }}>
      <SetupLogo />
      <Divider />

      {step === 'welcome' && <WelcomeStep onContinue={() => setStep('provider')} />}

      {step === 'provider' && <ProviderSelector onSelect={handleProviderSelect} />}

      {step === 'apikey' && provider && (
        <ApiKeyInput providerLabel={providerMeta?.label ?? provider} onSubmit={handleApiKeySubmit} />
      )}

      {step === 'saving' && provider && (
        <SavingStep provider={provider} apiKey={apiKey} onDone={() => setStep('done')} />
      )}

      {step === 'done' && provider && <DoneStep provider={provider} onExit={onExit} />}
    </box>
  );
};
