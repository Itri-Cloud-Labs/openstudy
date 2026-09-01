import React from 'react';
import { TextAttributes } from '@opentui/core';
import { useAppKeys, useAppPaste } from '../../shared/terminal/keymap.js';
import { SETUP_THEME } from './theme.js';

interface ApiKeyInputProps {
  providerLabel: string;
  onSubmit: (apiKey: string) => void;
}

export const ApiKeyInput = ({ providerLabel, onSubmit }: ApiKeyInputProps) => {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState('');

  useAppKeys(({ input, key }) => {
    if (key.return) {
      if (value.trim().length === 0) {
        setError('API key cannot be empty.');
        return;
      }
      onSubmit(value.trim());
      return;
    }

    if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
      setError('');
      return;
    }

    // Ignore non-printable keys
    if (key.ctrl || key.meta || key.escape) return;

    setValue(prev => prev + input);
    setError('');
  });

  useAppPaste(({ input }) => {
    setValue(current => current + input);
    setError('');
  });

  const masked = '●'.repeat(value.length);

  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      <text fg={SETUP_THEME.text} attributes={TextAttributes.BOLD}>
        {`Enter your ${providerLabel} API key:`}
      </text>

      <box
        style={{
          borderStyle: 'rounded',
          borderColor: error ? SETUP_THEME.danger : SETUP_THEME.muted,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <text fg={value.length > 0 ? SETUP_THEME.text : SETUP_THEME.muted}>
          {value.length > 0 ? masked : 'Type your key…'}
        </text>
      </box>

      {error ? (
        <text fg={SETUP_THEME.danger}>{error}</text>
      ) : (
        <text fg={SETUP_THEME.muted} attributes={TextAttributes.DIM}>
          Input is hidden enter to confirm
        </text>
      )}
    </box>
  );
};
