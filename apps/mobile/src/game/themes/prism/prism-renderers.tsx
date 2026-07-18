import {
  BlurMask,
  Circle,
  Fill,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';

import { PADDLE_MAX_GLOW_TRAIL_OFFSET } from '@/game/presentation/paddle-presentation';
import type { CanvasSize, SceneBall, ScenePaddle } from '@/game/rendering/types';
import {
  PRISM_SPECTRUM,
  PRISM_SPECTRUM_LOOP,
  prismPalette,
} from '@/game/themes/prism/prism-tokens';
import type {
  ArenaRendererProps,
  BallRendererProps,
  CenterLineRendererProps,
  PaddleRendererProps,
} from '@/game/themes/types';

const FACET_INDICES = [1, 2, 3, 4] as const;
const ARENA_RAYS = [
  { color: '#50efff', endX: 1.08, endY: 0.27 },
  { color: '#5d8dff', endX: 1.08, endY: 0.36 },
  { color: '#86ffd1', endX: 1.08, endY: 0.44 },
  { color: '#ff65cf', endX: -0.08, endY: 0.57 },
  { color: '#b86cff', endX: -0.08, endY: 0.66 },
  { color: '#fff58a', endX: -0.08, endY: 0.75 },
] as const;

function PrismArenaRay({
  canvasSize,
  color,
  endX,
  endY,
  opacity,
}: {
  canvasSize: SharedValue<CanvasSize>;
  color: string;
  endX: number;
  endY: number;
  opacity: SharedValue<number>;
}) {
  const start = useDerivedValue(() =>
    vec(canvasSize.value.width / 2, canvasSize.value.height / 2),
  );
  const end = useDerivedValue(() =>
    vec(canvasSize.value.width * endX, canvasSize.value.height * endY),
  );

  return (
    <Line
      p1={start}
      p2={end}
      color={color}
      opacity={opacity}
      style="stroke"
      strokeWidth={22}
    >
      <BlurMask blur={28} style="normal" />
    </Line>
  );
}

export function PrismArena({ canvasSize, rallyHitCount }: ArenaRendererProps) {
  const bounds = useDerivedValue(() => ({
    x: 0,
    y: 0,
    width: canvasSize.value.width,
    height: canvasSize.value.height,
  }));
  const gradientStart = useDerivedValue(() =>
    vec(canvasSize.value.width / 2, 0),
  );
  const gradientEnd = useDerivedValue(() =>
    vec(canvasSize.value.width / 2, canvasSize.value.height),
  );
  const topFocus = useDerivedValue(() =>
    vec(canvasSize.value.width * 0.5, canvasSize.value.height * 0.08),
  );
  const bottomFocus = useDerivedValue(() =>
    vec(canvasSize.value.width * 0.5, canvasSize.value.height * 0.92),
  );
  const bloomRadius = useDerivedValue(
    () => Math.max(canvasSize.value.width, canvasSize.value.height) * 0.48,
  );
  const rayOpacity = useDerivedValue(() => {
    const rallyCharge = Math.min((rallyHitCount?.value ?? 0) / 30, 1);
    return 0.025 + rallyCharge * 0.035;
  });

  return (
    <Group>
      <Fill color={prismPalette.arena} />
      <Rect rect={bounds} opacity={0.94}>
        <LinearGradient
          start={gradientStart}
          end={gradientEnd}
          colors={[
            '#07151b',
            prismPalette.arena,
            '#02091a',
            prismPalette.arena,
            '#160720',
          ]}
          positions={[0, 0.25, 0.5, 0.75, 1]}
        />
      </Rect>
      <Rect rect={bounds} opacity={0.22}>
        <RadialGradient
          c={topFocus}
          r={bloomRadius}
          colors={['#50efff', 'rgba(80, 239, 255, 0)']}
        />
      </Rect>
      <Rect rect={bounds} opacity={0.2}>
        <RadialGradient
          c={bottomFocus}
          r={bloomRadius}
          colors={['#ff65cf', 'rgba(255, 101, 207, 0)']}
        />
      </Rect>
      {ARENA_RAYS.map((ray) => (
        <PrismArenaRay
          canvasSize={canvasSize}
          color={ray.color}
          endX={ray.endX}
          endY={ray.endY}
          key={`${ray.endX}-${ray.endY}`}
          opacity={rayOpacity}
        />
      ))}
    </Group>
  );
}

export function PrismCenterLine({ line }: CenterLineRendererProps) {
  const start = useDerivedValue(() => vec(line.value.x, line.value.y));
  const end = useDerivedValue(() =>
    vec(line.value.x + line.value.width, line.value.y),
  );
  const centerX = useDerivedValue(() => line.value.x + line.value.width / 2);
  const centerY = useDerivedValue(() => line.value.y + line.value.height / 2);
  const center = useDerivedValue(() => vec(centerX.value, centerY.value));

  return (
    <Group>
      <Rect rect={line} opacity={0.72}>
        <LinearGradient
          start={start}
          end={end}
          colors={PRISM_SPECTRUM_LOOP}
        />
        <BlurMask blur={12} style="normal" />
      </Rect>
      <Rect rect={line}>
        <LinearGradient
          start={start}
          end={end}
          colors={PRISM_SPECTRUM_LOOP}
        />
      </Rect>
      <Circle cx={centerX} cy={centerY} r={3} opacity={0.95}>
        <SweepGradient c={center} colors={PRISM_SPECTRUM_LOOP} />
        <BlurMask blur={6} style="normal" />
      </Circle>
    </Group>
  );
}

function PrismPaddleFacet({
  index,
  paddle,
}: {
  index: number;
  paddle: ScenePaddle;
}) {
  const start = useDerivedValue(() => {
    const source = paddle.rect.value.rect;
    const x = source.x + (source.width * index) / 5;
    return vec(x, source.y + 1);
  });
  const end = useDerivedValue(() => {
    const source = paddle.rect.value.rect;
    const direction = index % 2 === 0 ? -1 : 1;
    const x =
      source.x +
      (source.width * index) / 5 +
      direction * Math.min(source.width * 0.08, 10);
    return vec(x, source.y + source.height - 1);
  });

  return (
    <Line
      p1={start}
      p2={end}
      color={prismPalette.ball.core}
      opacity={0.46}
      style="stroke"
      strokeWidth={1}
    />
  );
}

export function PrismPaddle({ paddle, trailIntensity }: PaddleRendererProps) {
  const player = prismPalette.players[paddle.id];
  const spectrum =
    paddle.id === 'top' ? [...PRISM_SPECTRUM].reverse() : PRISM_SPECTRUM;
  const gradientStart = useDerivedValue(() => {
    const source = paddle.rect.value.rect;
    return vec(source.x, source.y + source.height / 2);
  });
  const gradientEnd = useDerivedValue(() => {
    const source = paddle.rect.value.rect;
    return vec(source.x + source.width, source.y + source.height / 2);
  });
  const trailStrength = useDerivedValue(() =>
    Math.min(
      Math.abs(paddle.trailOffsetX.value) / PADDLE_MAX_GLOW_TRAIL_OFFSET,
      1,
    ),
  );
  const nearTrailOpacity = useDerivedValue(
    () => trailStrength.value * 0.26 * trailIntensity,
  );
  const farTrailOpacity = useDerivedValue(
    () => trailStrength.value * 0.1 * trailIntensity,
  );
  const pulseOpacity = useDerivedValue(() =>
    Math.max(0.28, Math.min(paddle.glowPulse.value * 0.34, 0.72)),
  );

  return (
    <Group>
      <RoundedRect
        rect={paddle.trailRects[1]}
        color={player.glow}
        opacity={farTrailOpacity}
      >
        <BlurMask blur={14} style="normal" />
      </RoundedRect>
      <RoundedRect
        rect={paddle.trailRects[0]}
        color={player.core}
        opacity={nearTrailOpacity}
      >
        <BlurMask blur={7} style="normal" />
      </RoundedRect>
      <RoundedRect
        rect={paddle.glowRect}
        color={player.glow}
        opacity={pulseOpacity}
      >
        <BlurMask blur={18} style="normal" />
      </RoundedRect>
      <RoundedRect rect={paddle.rect} opacity={0.92}>
        <LinearGradient
          start={gradientStart}
          end={gradientEnd}
          colors={spectrum}
        />
      </RoundedRect>
      <RoundedRect
        rect={paddle.rect}
        color={prismPalette.ball.core}
        opacity={0.8}
        style="stroke"
        strokeWidth={1.5}
      />
      {FACET_INDICES.map((index) => (
        <PrismPaddleFacet index={index} key={index} paddle={paddle} />
      ))}
    </Group>
  );
}

function PrismBallFacet({
  ball,
  from,
  to,
}: {
  ball: SceneBall;
  from: readonly [number, number];
  to: readonly [number, number];
}) {
  const start = useDerivedValue(() =>
    vec(
      ball.centerX.value + ball.radius.value * from[0],
      ball.centerY.value + ball.radius.value * from[1],
    ),
  );
  const end = useDerivedValue(() =>
    vec(
      ball.centerX.value + ball.radius.value * to[0],
      ball.centerY.value + ball.radius.value * to[1],
    ),
  );

  return (
    <Line
      p1={start}
      p2={end}
      color={prismPalette.ball.core}
      opacity={0.44}
      style="stroke"
      strokeWidth={1}
    />
  );
}

const BALL_FACETS = [
  { from: [-0.62, -0.2], to: [0.55, 0.45] },
  { from: [-0.55, 0.42], to: [0.58, -0.38] },
  { from: [-0.08, -0.78], to: [-0.55, 0.42] },
  { from: [-0.08, -0.78], to: [0.58, -0.38] },
] as const;

export function PrismBall({ ball, trailIntensity }: BallRendererProps) {
  const origin = useDerivedValue(() =>
    vec(ball.centerX.value, ball.centerY.value),
  );
  const transform = useDerivedValue(() => [
    { scaleX: ball.scaleX.value },
    { scaleY: ball.scaleY.value },
  ]);
  const glowColor = useDerivedValue(() => {
    const player = ball.lastHitBy.value;
    return player ? prismPalette.players[player].glow : prismPalette.ball.glow;
  });
  const trailColors = useDerivedValue(() => [
    'rgba(255, 101, 207, 0)',
    '#b86cff',
    '#5d8dff',
    '#50efff',
    '#fff58a',
  ]);
  const trailCoreColors = useDerivedValue(() => [
    'rgba(255, 255, 255, 0)',
    'rgba(255, 255, 255, 0.95)',
  ]);
  const outerTrailWidth = useDerivedValue(() => ball.radius.value * 1.3);
  const innerTrailWidth = useDerivedValue(() => ball.radius.value * 0.16);
  const ringRadius = useDerivedValue(() => ball.radius.value * 1.14);
  const innerRadius = useDerivedValue(() => ball.radius.value * 0.82);
  const highlightX = useDerivedValue(
    () => ball.centerX.value - ball.radius.value * 0.28,
  );
  const highlightY = useDerivedValue(
    () => ball.centerY.value - ball.radius.value * 0.32,
  );
  const highlightCenter = useDerivedValue(() =>
    vec(highlightX.value, highlightY.value),
  );
  const highlightRadius = useDerivedValue(() => ball.radius.value * 0.2);

  return (
    <Group>
      <Path
        path={ball.trail.path}
        style="stroke"
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={outerTrailWidth}
        opacity={0.32 * trailIntensity}
      >
        <LinearGradient
          start={ball.trail.start}
          end={ball.trail.end}
          colors={trailColors}
        />
        <BlurMask blur={12} style="normal" />
      </Path>
      <Path
        path={ball.trail.path}
        style="stroke"
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={innerTrailWidth}
        opacity={0.72 * trailIntensity}
      >
        <LinearGradient
          start={ball.trail.start}
          end={ball.trail.end}
          colors={trailCoreColors}
        />
        <BlurMask blur={2} style="normal" />
      </Path>

      <Group origin={origin} transform={transform}>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ringRadius}
          color={glowColor}
          opacity={0.72}
        >
          <BlurMask blur={18} style="normal" />
        </Circle>
        <Circle cx={ball.centerX} cy={ball.centerY} r={ball.radius}>
          <SweepGradient c={origin} colors={PRISM_SPECTRUM_LOOP} />
        </Circle>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={innerRadius}
          opacity={0.76}
        >
          <RadialGradient
            c={highlightCenter}
            r={ball.radius}
            colors={[
              'rgba(255, 255, 255, 0.98)',
              'rgba(140, 224, 255, 0.4)',
              'rgba(21, 20, 68, 0.46)',
            ]}
          />
        </Circle>
        {BALL_FACETS.map((facet) => (
          <PrismBallFacet
            ball={ball}
            from={facet.from}
            key={`${facet.from[0]}-${facet.from[1]}-${facet.to[0]}-${facet.to[1]}`}
            to={facet.to}
          />
        ))}
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={prismPalette.ball.core}
          opacity={0.86}
          style="stroke"
          strokeWidth={1.6}
        />
        <Circle
          cx={highlightX}
          cy={highlightY}
          r={highlightRadius}
          color={prismPalette.ball.core}
          opacity={0.86}
        />
      </Group>
    </Group>
  );
}
