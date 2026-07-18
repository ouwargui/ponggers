import type { TextStyle } from 'react-native';

export function voltTextGlow(color: string, radius: number): TextStyle {
  const sharpRadius = Math.max(1, radius * 0.58);
  const inset = Math.ceil(sharpRadius + 3);

  return {
    margin: -inset,
    padding: inset,
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: sharpRadius,
  };
}
