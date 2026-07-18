import { BlurMask, Group, Line } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { IMPACT_PARTICLE_POOL_SIZE } from '@/game/presentation/impact-particles';
import {
  PRISM_SPECTRUM,
  prismPalette,
} from '@/game/themes/prism/prism-tokens';
import type { ImpactParticlesRendererProps } from '@/game/themes/types';

function PrismImpactParticle({
  index,
  particles,
}: ImpactParticlesRendererProps & { index: number }) {
  const start = useDerivedValue(() => {
    const particle = particles.value[index];

    if (!particle?.active) {
      return { x: 0, y: 0 };
    }

    return {
      x: particle.x - particle.velocityX * particle.tailDurationSeconds,
      y: particle.y - particle.velocityY * particle.tailDurationSeconds,
    };
  });
  const end = useDerivedValue(() => {
    const particle = particles.value[index];
    return {
      x: particle?.active ? particle.x : 0,
      y: particle?.active ? particle.y : 0,
    };
  });
  const shardStart = useDerivedValue(() => {
    const midpointX = start.value.x + (end.value.x - start.value.x) * 0.62;
    const midpointY = start.value.y + (end.value.y - start.value.y) * 0.62;
    const deltaX = end.value.x - start.value.x;
    const deltaY = end.value.y - start.value.y;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const halfWidth = Math.min(length * 0.18, 6);

    return {
      x: midpointX + (-deltaY / length) * halfWidth,
      y: midpointY + (deltaX / length) * halfWidth,
    };
  });
  const shardEnd = useDerivedValue(() => {
    const midpointX = start.value.x + (end.value.x - start.value.x) * 0.62;
    const midpointY = start.value.y + (end.value.y - start.value.y) * 0.62;
    const deltaX = end.value.x - start.value.x;
    const deltaY = end.value.y - start.value.y;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const halfWidth = Math.min(length * 0.18, 6);

    return {
      x: midpointX - (-deltaY / length) * halfWidth,
      y: midpointY - (deltaX / length) * halfWidth,
    };
  });
  const opacity = useDerivedValue(() => {
    const particle = particles.value[index];
    if (!particle?.active || particle.lifetimeMs <= 0) {
      return 0;
    }

    return Math.max(0, 1 - particle.ageMs / particle.lifetimeMs) ** 1.15;
  });
  const width = useDerivedValue(() => particles.value[index]?.width ?? 0);
  const glowWidth = useDerivedValue(() => width.value * 3.4);
  const color = PRISM_SPECTRUM[index % PRISM_SPECTRUM.length];

  return (
    <Group>
      <Line
        p1={start}
        p2={end}
        color={color}
        opacity={opacity}
        style="stroke"
        strokeCap="round"
        strokeWidth={glowWidth}
      >
        <BlurMask blur={6} style="normal" />
      </Line>
      <Line
        p1={start}
        p2={end}
        color={prismPalette.ball.core}
        opacity={opacity}
        style="stroke"
        strokeCap="round"
        strokeWidth={width}
      />
      <Line
        p1={shardStart}
        p2={shardEnd}
        color={color}
        opacity={opacity}
        style="stroke"
        strokeCap="round"
        strokeWidth={width}
      />
    </Group>
  );
}

const PARTICLE_INDICES = Array.from(
  { length: IMPACT_PARTICLE_POOL_SIZE },
  (_, index) => index,
);

export function PrismImpactParticles({
  particles,
}: ImpactParticlesRendererProps) {
  return (
    <Group>
      {PARTICLE_INDICES.map((index) => (
        <PrismImpactParticle key={index} index={index} particles={particles} />
      ))}
    </Group>
  );
}
