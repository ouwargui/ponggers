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
import { useDerivedValue } from 'react-native-reanimated';
import { PADDLE_MAX_GLOW_TRAIL_OFFSET } from '@/game/presentation/paddle-presentation';
import { neonPalette } from '@/game/themes/neon/neon-tokens';
import type {
  ArenaRendererProps,
  BallRendererProps,
  CenterLineRendererProps,
  PaddleRendererProps,
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

export function NeonPaddle({ paddle, trailIntensity }: PaddleRendererProps) {
  const colors = neonPalette.players[paddle.id];
  const trailStrength = useDerivedValue(() =>
    Math.min(
      Math.abs(paddle.trailOffsetX.value) / PADDLE_MAX_GLOW_TRAIL_OFFSET,
      1,
    ),
  );
  const nearTrailOpacity = useDerivedValue(
    () => trailStrength.value * 0.2 * trailIntensity,
  );
  const farTrailOpacity = useDerivedValue(
    () => trailStrength.value * 0.08 * trailIntensity,
  );
  const pulseHaloOpacity = useDerivedValue(() =>
    Math.max(0, Math.min((paddle.glowPulse.value - 1) * 0.5, 0.42)),
  );
  const outerGlowOpacity = useDerivedValue(() =>
    Math.min(0.62, 0.4 * paddle.glowPulse.value),
  );
  const innerGlowOpacity = useDerivedValue(() =>
    Math.min(1, 0.85 * paddle.glowPulse.value),
  );

  return (
    <Group>
      <RoundedRect
        rect={paddle.trailRects[1]}
        color={colors.glow}
        opacity={farTrailOpacity}
      >
        <BlurMask blur={16} style="normal" />
      </RoundedRect>
      <RoundedRect
        rect={paddle.trailRects[0]}
        color={colors.glow}
        opacity={nearTrailOpacity}
      >
        <BlurMask blur={10} style="normal" />
      </RoundedRect>
      <RoundedRect
        rect={paddle.glowRect}
        color={colors.glow}
        opacity={pulseHaloOpacity}
      >
        <BlurMask blur={28} style="normal" />
      </RoundedRect>
      <RoundedRect
        rect={paddle.glowRect}
        color={colors.glow}
        opacity={outerGlowOpacity}
      >
        <BlurMask blur={18} style="normal" />
      </RoundedRect>
      <RoundedRect
        rect={paddle.glowRect}
        color={colors.glow}
        opacity={innerGlowOpacity}
      >
        <BlurMask blur={6} style="normal" />
      </RoundedRect>
      <RoundedRect rect={paddle.rect} color={colors.core} />
    </Group>
  );
}

export function NeonBall({ ball, trailIntensity }: BallRendererProps) {
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
        opacity={0.5 * trailIntensity}
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
        opacity={0.7 * trailIntensity}
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
