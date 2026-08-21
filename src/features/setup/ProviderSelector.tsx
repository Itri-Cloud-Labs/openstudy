import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Provider } from '../../domain/provider.js';
import { PROVIDER_METADATA } from '../../providers/index.js';

interface ProviderSelectorProps {
  onSelect: (provider: Provider) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({ onSelect }) => {
  const [cursor, setCursor] = React.useState(0);

  useInput((_, key) => {
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
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">
        Select an AI provider:
      </Text>
      <Box flexDirection="column">
        {PROVIDER_METADATA.map((provider, index) => {
          const isActive = index === cursor;
          return (
            <Box key={provider.id} paddingLeft={1}>
              <Text color={isActive ? 'cyan' : 'gray'}>
                {isActive ? '❯ ' : '  '}
                {provider.label}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Text dimColor>↑ ↓ navigate enter select</Text>
    </Box>
  );
};
