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
  ArenaRendererProps,
  BallRendererProps,
  CenterLineRendererProps,
  PaddleRendererProps,
  ScoreHudRendererProps,
} from '@/game/themes/types';

const CONTROL_ZONE_OPACITY = 0.12;

export function NeonArena({ canvasSize }: ArenaRendererProps) {
  const gradientStart = useDerivedValue(() =>
    vec(canvasSize.value.width / 2, 0),
  );
  const gradientEnd = useDerivedValue(() =>
    vec(canvasSize.value.width / 2, canvasSize.value.height),
  );

  return (
    <Group>
      <Fill color={neonPalette.arena} />
      <Fill opacity={CONTROL_ZONE_OPACITY}>
        <LinearGradient
          start={gradientStart}
          end={gradientEnd}
          colors={[
            neonPalette.players.top.glow,
            neonPalette.arena,
            neonPalette.players.bottom.glow,
          ]}
          positions={[0, 0.5, 1]}
        />
      </Fill>
    </Group>
  );
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
  const glowColor = useDerivedValue(() => {
    if (ball.lastHitBy.value === 'top') {
      return neonPalette.players.top.glow;
    }

    if (ball.lastHitBy.value === 'bottom') {
      return neonPalette.players.bottom.glow;
    }

    return neonPalette.ball.glow;
  });
  const coreColor = useDerivedValue(() => {
    if (ball.lastHitBy.value === 'top') {
      return neonPalette.players.top.core;
    }

    if (ball.lastHitBy.value === 'bottom') {
      return neonPalette.players.bottom.core;
    }

    return neonPalette.ball.core;
  });
  const outerTrailColors = useDerivedValue(() => {
    if (ball.lastHitBy.value === 'top') {
      return ['rgba(255, 90, 31, 0)', neonPalette.players.top.glow];
    }

    if (ball.lastHitBy.value === 'bottom') {
      return ['rgba(0, 229, 255, 0)', neonPalette.players.bottom.glow];
    }

    return ['rgba(125, 249, 255, 0)', neonPalette.ball.glow];
  });
  const innerTrailColors = useDerivedValue(() => {
    if (ball.lastHitBy.value === 'top') {
      return ['rgba(255, 241, 232, 0)', neonPalette.players.top.core];
    }

    if (ball.lastHitBy.value === 'bottom') {
      return ['rgba(231, 253, 255, 0)', neonPalette.players.bottom.core];
    }

    return ['rgba(255, 255, 255, 0)', neonPalette.ball.core];
  });

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
          colors={outerTrailColors}
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
          colors={innerTrailColors}
        />
        <BlurMask blur={4} style="normal" />
      </Path>

      <Group origin={origin} transform={transform}>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={glowColor}
          opacity={0.45}
        >
          <BlurMask blur={20} style="normal" />
        </Circle>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={glowColor}
          opacity={0.9}
        >
          <BlurMask blur={7} style="normal" />
        </Circle>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={coreColor}
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
