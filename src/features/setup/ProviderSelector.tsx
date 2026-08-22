import React from 'react';
import { TextAttributes } from '@opentui/core';
import type { Provider } from '../../domain/provider.js';
import { PROVIDER_METADATA } from '../../providers/index.js';
import { useAppKeys } from '../../shared/terminal/keymap.js';

interface ProviderSelectorProps {
  onSelect: (provider: Provider) => void;
}

export const ProviderSelector = ({ onSelect }: ProviderSelectorProps) => {
  const [cursor, setCursor] = React.useState(0);

  useAppKeys(({ key }) => {
    if (key.upArrow) {
      setCursor(prev => (prev - 1 + PROVIDER_METADATA.length) % PROVIDER_METADATA.length);
    } else if (key.downArrow) {
      setCursor(prev => (prev + 1) % PROVIDER_METADATA.length);
    } else if (key.return) {
      const provider = PROVIDER_METADATA[cursor];
      if (provider) onSelect(provider.id);
    }
  });

  return (
    <box style={{ flexDirection: 'column', marginBottom: 1 }}>
      <text fg="#ffffff" attributes={TextAttributes.BOLD}>
        Select an AI provider:
      </text>
      <box style={{ flexDirection: 'column' }}>
        {PROVIDER_METADATA.map((provider, index) => {
          const isActive = index === cursor;
          return (
            <box key={provider.id} style={{ paddingLeft: 1 }}>
              <text fg={isActive ? '#56b6c2' : '#808080'}>
                {isActive ? '❯ ' : '  '}
                {provider.label}
              </text>
            </box>
          );
        })}
      </box>
      <text fg="#808080" attributes={TextAttributes.DIM}>
        ↑ ↓ navigate enter select
      </text>
    </box>
  );
};
