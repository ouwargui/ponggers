import {
  BlurMask,
  Circle,
  Fill,
  Group,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import { Text, type TextStyle, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { neonPalette } from '@/game/themes/neon/neon-tokens';
import type {
  BallRendererProps,
  CenterLineRendererProps,
  PaddleRendererProps,
  ScoreHudRendererProps,
} from '@/game/themes/types';

export function NeonArena() {
  return <Fill color={neonPalette.arena} />;
}

export function NeonCenterLine({ line }: CenterLineRendererProps) {
  return (
    <Group>
      <Rect rect={line} color={neonPalette.centerLine.glow} opacity={0.45}>
        <BlurMask blur={18} style="normal" />
      </Rect>
      <Rect rect={line} color={neonPalette.centerLine.glow} opacity={0.7}>
        <BlurMask blur={6} style="normal" />
      </Rect>
      <Rect rect={line} color={neonPalette.centerLine.core} opacity={0.55} />
    </Group>
  );
}

export function NeonPaddle({ paddle }: PaddleRendererProps) {
  const colors = neonPalette.players[paddle.id];

  return (
    <Group>
      <RoundedRect rect={paddle.rect} color={colors.glow} opacity={0.4}>
        <BlurMask blur={18} style="normal" />
      </RoundedRect>
      <RoundedRect rect={paddle.rect} color={colors.glow} opacity={0.85}>
        <BlurMask blur={6} style="normal" />
      </RoundedRect>
      <RoundedRect rect={paddle.rect} color={colors.core} />
    </Group>
  );
}

export function NeonBall({ ball }: BallRendererProps) {
  const origin = useDerivedValue(() =>
    vec(ball.centerX.value, ball.centerY.value),
  );
  const transform = useDerivedValue(() => [
    { scaleX: ball.scaleX.value },
    { scaleY: ball.scaleY.value },
  ]);
  const outerTrailWidth = useDerivedValue(() => ball.radius.value * 1.8);
  const innerTrailWidth = useDerivedValue(() => ball.radius.value * 0.85);

  return (
    <Group>
      <Path
        path={ball.trail.path}
        style="stroke"
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={outerTrailWidth}
        opacity={0.5}
      >
        <LinearGradient
          start={ball.trail.start}
          end={ball.trail.end}
          colors={['rgba(125, 249, 255, 0)', neonPalette.ball.glow]}
        />
        <BlurMask blur={14} style="normal" />
      </Path>
      <Path
        path={ball.trail.path}
        style="stroke"
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={innerTrailWidth}
        opacity={0.7}
      >
        <LinearGradient
          start={ball.trail.start}
          end={ball.trail.end}
          colors={['rgba(125, 249, 255, 0)', neonPalette.ball.core]}
        />
        <BlurMask blur={4} style="normal" />
      </Path>

      <Group origin={origin} transform={transform}>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={neonPalette.ball.glow}
          opacity={0.45}
        >
          <BlurMask blur={20} style="normal" />
        </Circle>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={neonPalette.ball.glow}
          opacity={0.9}
        >
          <BlurMask blur={7} style="normal" />
        </Circle>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={neonPalette.ball.core}
        />
      </Group>
    </Group>
  );
}

function NeonScore({
  value,
  player,
}: {
  value: number;
  player: 'top' | 'bottom';
}) {
  const colors = neonPalette.players[player];
  const style: TextStyle = {
    color: colors.core,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textShadowColor: colors.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  };

  return <Text style={style}>{value}</Text>;
}

export function NeonScoreHud({
  score,
  topInset,
  bottomInset,
}: ScoreHudRendererProps) {
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
      <NeonScore player="top" value={score.top} />
      <NeonScore player="bottom" value={score.bottom} />
    </View>
  );
}
