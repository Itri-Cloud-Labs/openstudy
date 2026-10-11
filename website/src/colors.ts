const RAISED = '#1f1f23';

function channels(hex: string) {
  return [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
}

function luminance(hex: string) {
  const [red, green, blue] = channels(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function mixWithWhite(hex: string, amount: number) {
  const mixed = channels(hex).map(value =>
    Math.round(value + (255 - value) * amount)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${mixed.join('')}`;
}

// Subject colors are tuned for fills. As text on the raised prompt they need a lighter shade to stay readable.
export function readableSubject(hex: string) {
  let color = hex;
  for (let step = 1; contrast(color, RAISED) < 4.5 && step <= 10; step += 1) color = mixWithWhite(hex, step / 10);
  return color;
}

export function onSubject(hex: string) {
  return contrast(hex, '#000000') >= 4.5 ? '#000000' : '#ffffff';
}
