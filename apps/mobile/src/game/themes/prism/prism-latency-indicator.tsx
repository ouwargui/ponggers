import { StyleSheet, Text } from 'react-native';

import { prismPalette } from '@/game/themes/prism/prism-tokens';
import type { LatencyIndicatorRendererProps } from '@/game/themes/types';

export function PrismLatencyIndicator({
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
        {
          borderColor: prismPalette.players[player].glow,
          color: prismPalette.players[player].core,
          shadowColor: prismPalette.players[player].glow,
        },
        player === 'top' ? { top: topInset + 4 } : { bottom: bottomInset + 4 },
      ]}
    >
      ◇ {Math.max(0, Math.round(latencyMs))} MS
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    fontSize: 8,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0.7,
    lineHeight: 14,
    opacity: 0.58,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    textAlign: 'right',
    zIndex: 3,
  },
});
