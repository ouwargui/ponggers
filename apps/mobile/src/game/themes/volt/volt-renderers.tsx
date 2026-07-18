import {
  BlurMask,
  Circle,
  DiscretePathEffect,
  Fill,
  Group,
  Line,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';

import { PADDLE_MAX_GLOW_TRAIL_OFFSET } from '@/game/presentation/paddle-presentation';
import type { CanvasSize, ScenePaddle } from '@/game/rendering/types';
import type {
  ArenaRendererProps,
  BallRendererProps,
  CenterLineRendererProps,
  PaddleRendererProps,
} from '@/game/themes/types';
import { voltPalette } from '@/game/themes/volt/volt-tokens';

const ARENA_TRACE_INDICES = Array.from({ length: 7 }, (_, index) => index);
const CENTER_SEGMENT_COUNT = 11;
const CENTER_SEGMENT_INDICES = Array.from(
  { length: CENTER_SEGMENT_COUNT },
  (_, index) => index,
);
const ELECTRODE_GAP_INDICES = [1, 2, 3, 4] as const;

function VoltArenaTrace({
  canvasSize,
  index,
  mirrored,
}: {
  canvasSize: SharedValue<CanvasSize>;
  index: number;
  mirrored: boolean;
}) {
  const start = useDerivedValue(() => {
    const { height, width } = canvasSize.value;
    const baseY = height * (0.055 + index * 0.045);
    const y = mirrored ? height - baseY : baseY;

    return vec(-width * 0.08, y);
  });
  const end = useDerivedValue(() => {
    const { height, width } = canvasSize.value;
    const baseY = height * (0.055 + index * 0.045);
    const diagonal = width * 0.18;
    const y = mirrored ? height - baseY - diagonal : baseY + diagonal;

    return vec(width * 1.08, y);
  });

  return (
    <Line
      p1={start}
      p2={end}
      color={
        mirrored
          ? voltPalette.players.bottom.glow
          : voltPalette.players.top.glow
      }
      opacity={0.045}
      style="stroke"
      strokeWidth={1}
    />
  );
}

export function VoltArena({ canvasSize, rallyHitCount }: ArenaRendererProps) {
  const gradientStart = useDerivedValue(() =>
    vec(canvasSize.value.width / 2, 0),
  );
  const gradientEnd = useDerivedValue(() =>
    vec(canvasSize.value.width / 2, canvasSize.value.height),
  );
  const chargeOpacity = useDerivedValue(() => {
    const rallyCharge = Math.min((rallyHitCount?.value ?? 0) / 30, 1);
    return 0.15 + rallyCharge * 0.16;
  });

  return (
    <Group>
      <Fill color={voltPalette.arena} />
      <Fill opacity={chargeOpacity}>
        <LinearGradient
          start={gradientStart}
          end={gradientEnd}
          colors={[
            voltPalette.players.top.glow,
            voltPalette.arena,
            voltPalette.players.bottom.glow,
          ]}
          positions={[0, 0.5, 1]}
        />
      </Fill>

      {ARENA_TRACE_INDICES.map((index) => (
        <Group key={index}>
          <VoltArenaTrace
            canvasSize={canvasSize}
            index={index}
            mirrored={false}
          />
          <VoltArenaTrace canvasSize={canvasSize} index={index} mirrored />
        </Group>
      ))}
    </Group>
  );
}

function VoltBusSegment({
  index,
  line,
}: CenterLineRendererProps & { index: number }) {
  const segment = useDerivedValue(() => {
    const source = line.value;
    const gap = 6;
    const segmentWidth =
      (source.width - gap * (CENTER_SEGMENT_COUNT - 1)) / CENTER_SEGMENT_COUNT;

    return {
      x: source.x + index * (segmentWidth + gap),
      y: source.y,
      width: Math.max(0, segmentWidth),
      height: source.height,
    };
  });
  const nodeX = useDerivedValue(
    () => segment.value.x + segment.value.width / 2,
  );
  const nodeY = useDerivedValue(
    () => segment.value.y + segment.value.height / 2,
  );

  return (
    <Group>
      <Rect rect={segment} color={voltPalette.centerLine.glow} opacity={0.55}>
        <BlurMask blur={index % 2 === 0 ? 9 : 5} style="normal" />
      </Rect>
      <Rect
        rect={segment}
        color={voltPalette.centerLine.core}
        opacity={index % 2 === 0 ? 0.9 : 0.55}
      />
      {index % 2 === 0 ? (
        <Circle
          cx={nodeX}
          cy={nodeY}
          r={2.2}
          color={voltPalette.centerLine.core}
        />
      ) : null}
    </Group>
  );
}

export function VoltCenterLine({ line }: CenterLineRendererProps) {
  return (
    <Group>
      {CENTER_SEGMENT_INDICES.map((index) => (
        <VoltBusSegment key={index} index={index} line={line} />
      ))}
    </Group>
  );
}

function ElectrodeGap({
  index,
  paddle,
}: {
  index: number;
  paddle: ScenePaddle;
}) {
  const gap = useDerivedValue(() => {
    const source = paddle.rect.value.rect;
    const x = source.x + (source.width * index) / 5;

    return {
      x: x - 1.2,
      y: source.y + 1,
      width: 2.4,
      height: Math.max(0, source.height - 2),
    };
  });

  return <Rect rect={gap} color={voltPalette.arena} opacity={0.72} />;
}

export function VoltPaddle({ paddle, trailIntensity }: PaddleRendererProps) {
  const colors = voltPalette.players[paddle.id];
  const trailStrength = useDerivedValue(() =>
    Math.min(
      Math.abs(paddle.trailOffsetX.value) / PADDLE_MAX_GLOW_TRAIL_OFFSET,
      1,
    ),
  );
  const nearTrailOpacity = useDerivedValue(
    () => trailStrength.value * 0.28 * trailIntensity,
  );
  const farTrailOpacity = useDerivedValue(
    () => trailStrength.value * 0.12 * trailIntensity,
  );
  const pulseOpacity = useDerivedValue(() =>
    Math.max(0, Math.min((paddle.glowPulse.value - 1) * 0.72, 0.58)),
  );

  return (
    <Group>
      <RoundedRect
        rect={paddle.trailRects[1]}
        color={colors.glow}
        opacity={farTrailOpacity}
      >
        <BlurMask blur={9} style="normal" />
      </RoundedRect>
      <RoundedRect
        rect={paddle.trailRects[0]}
        color={colors.core}
        opacity={nearTrailOpacity}
      >
        <BlurMask blur={4} style="normal" />
      </RoundedRect>
      <RoundedRect
        rect={paddle.glowRect}
        color={colors.glow}
        opacity={pulseOpacity}
      >
        <BlurMask blur={24} style="normal" />
      </RoundedRect>
      <RoundedRect rect={paddle.glowRect} color={colors.glow} opacity={0.62}>
        <BlurMask blur={10} style="normal" />
      </RoundedRect>
      <RoundedRect rect={paddle.rect} color={colors.core} />
      <RoundedRect
        rect={paddle.rect}
        color={colors.glow}
        style="stroke"
        strokeWidth={2}
      />
      {ELECTRODE_GAP_INDICES.map((index) => (
        <ElectrodeGap key={index} index={index} paddle={paddle} />
      ))}
    </Group>
  );
}

export function VoltBall({ ball, trailIntensity }: BallRendererProps) {
  const origin = useDerivedValue(() =>
    vec(ball.centerX.value, ball.centerY.value),
  );
  const transform = useDerivedValue(() => [
    { scaleX: ball.scaleX.value },
    { scaleY: ball.scaleY.value },
  ]);
  const glowColor = useDerivedValue(() => {
    const player = ball.lastHitBy.value;
    return player ? voltPalette.players[player].glow : voltPalette.ball.glow;
  });
  const coreColor = useDerivedValue(() => {
    const player = ball.lastHitBy.value;
    return player ? voltPalette.players[player].core : voltPalette.ball.core;
  });
  const trailColors = useDerivedValue(() => {
    if (ball.lastHitBy.value === 'top') {
      return ['rgba(155, 92, 255, 0)', voltPalette.players.top.glow];
    }

    if (ball.lastHitBy.value === 'bottom') {
      return ['rgba(223, 255, 40, 0)', voltPalette.players.bottom.glow];
    }

    return ['rgba(239, 255, 154, 0)', voltPalette.ball.glow];
  });
  const outerTrailWidth = useDerivedValue(() => ball.radius.value * 1.35);
  const filamentWidth = useDerivedValue(() => ball.radius.value * 0.42);
  const ringRadius = useDerivedValue(() => ball.radius.value * 1.13);
  const highlightX = useDerivedValue(
    () => ball.centerX.value - ball.radius.value * 0.24,
  );
  const highlightY = useDerivedValue(
    () => ball.centerY.value - ball.radius.value * 0.24,
  );
  const highlightRadius = useDerivedValue(() => ball.radius.value * 0.18);

  return (
    <Group>
      <Path
        path={ball.trail.path}
        style="stroke"
        strokeCap="square"
        strokeJoin="bevel"
        strokeWidth={outerTrailWidth}
        opacity={0.3 * trailIntensity}
      >
        <LinearGradient
          start={ball.trail.start}
          end={ball.trail.end}
          colors={trailColors}
        />
        <DiscretePathEffect length={10} deviation={3.5} seed={11} />
        <BlurMask blur={8} style="normal" />
      </Path>
      <Path
        path={ball.trail.path}
        style="stroke"
        strokeCap="square"
        strokeJoin="bevel"
        strokeWidth={filamentWidth}
        opacity={0.92 * trailIntensity}
      >
        <LinearGradient
          start={ball.trail.start}
          end={ball.trail.end}
          colors={trailColors}
        />
        <DiscretePathEffect length={7} deviation={2.6} seed={29} />
      </Path>

      <Group origin={origin} transform={transform}>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ringRadius}
          color={glowColor}
          opacity={0.58}
        >
          <BlurMask blur={15} style="normal" />
        </Circle>
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ringRadius}
          color={glowColor}
          style="stroke"
          strokeWidth={2}
        />
        <Circle
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={coreColor}
        />
        <Circle
          cx={highlightX}
          cy={highlightY}
          r={highlightRadius}
          color={voltPalette.ball.core}
          opacity={0.92}
        />
      </Group>
    </Group>
  );
}
