import React from 'react';

export function useBlinkCursor(intervalMs = 530): boolean {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => setVisible(current => !current), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return visible;
}
