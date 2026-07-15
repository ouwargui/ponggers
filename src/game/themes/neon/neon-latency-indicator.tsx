import { StyleSheet, Text } from 'react-native';

import { neonPalette } from '@/game/themes/neon/neon-tokens';
import type { LatencyIndicatorRendererProps } from '@/game/themes/types';

export function NeonLatencyIndicator({
  latencyMs,
  player,
  topInset,
  bottomInset,
}: LatencyIndicatorRendererProps) {
  return (
    <Text
      pointerEvents="none"
      style={[
        styles.label,
        { color: neonPalette.players[player].core },
        player === 'top' ? { top: topInset + 4 } : { bottom: bottomInset + 4 },
      ]}
    >
      {Math.max(0, Math.round(latencyMs))} ms
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    right: 12,
    fontSize: 9,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: 12,
    opacity: 0.48,
    textAlign: 'right',
  },
});
