import { Text, type TextStyle, View } from 'react-native';

import { colors } from '@/game/constants';
import type { PlayerId } from '@/game/engine/types';

const scoreStyle: TextStyle = {
  color: colors.foreground,
  fontSize: 28,
  fontWeight: '700',
  fontVariant: ['tabular-nums'],
};

function Score({ value }: { value: number }) {
  return (
    <Text selectable style={scoreStyle}>
      {value}
    </Text>
  );
}

type ScoreHudProps = {
  score: Record<PlayerId, number>;
  topInset: number;
  bottomInset: number;
};

export function ScoreHud({ score, topInset, bottomInset }: ScoreHudProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: topInset + 72,
        paddingBottom: bottomInset + 72,
      }}
    >
      <Score value={score.top} />
      <Score value={score.bottom} />
    </View>
  );
}
