import type { TextStyle } from 'react-native';

export function neonTextGlow(color: string, radius: number): TextStyle {
  const inset = Math.ceil(radius + 4);

  return {
    margin: -inset,
    padding: inset,
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: radius,
  };
}
