import { StyleSheet, Text } from 'react-native';

import type { LatencyIndicatorRendererProps } from '@/game/themes/types';
import { voltPalette } from '@/game/themes/volt/volt-tokens';

export function VoltLatencyIndicator({
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
        { color: voltPalette.players[player].glow },
        player === 'top' ? { top: topInset + 4 } : { bottom: bottomInset + 4 },
      ]}
    >
      {Math.max(0, Math.round(latencyMs))} MS
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    right: 12,
    paddingLeft: 5,
    borderLeftWidth: 1,
    borderLeftColor: voltPalette.centerLine.glow,
    fontSize: 8,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0.8,
    lineHeight: 12,
    opacity: 0.52,
    textAlign: 'right',
    zIndex: 3,
  },
});
