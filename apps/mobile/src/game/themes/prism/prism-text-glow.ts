import type { TextStyle } from 'react-native';

export function prismTextGlow(color: string, radius: number): TextStyle {
  const softRadius = Math.max(1, radius * 0.72);
  const inset = Math.ceil(softRadius + 4);

  return {
    margin: -inset,
    padding: inset,
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: softRadius,
  };
}
