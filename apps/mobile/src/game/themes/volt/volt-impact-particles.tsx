import { BlurMask, Group, Line } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { IMPACT_PARTICLE_POOL_SIZE } from '@/game/presentation/impact-particles';
import type { ImpactParticlesRendererProps } from '@/game/themes/types';
import { voltPalette } from '@/game/themes/volt/volt-tokens';

function VoltImpactParticle({
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
  const branchStart = useDerivedValue(() => ({
    x: start.value.x + (end.value.x - start.value.x) * 0.58,
    y: start.value.y + (end.value.y - start.value.y) * 0.58,
  }));
  const branchEnd = useDerivedValue(() => {
    const dx = end.value.x - start.value.x;
    const dy = end.value.y - start.value.y;
    const length = Math.hypot(dx, dy) || 1;
    const direction = index % 2 === 0 ? 1 : -1;
    const branchLength = Math.min(12, length * 0.42);

    return {
      x: branchStart.value.x + (-dy / length) * branchLength * direction,
      y: branchStart.value.y + (dx / length) * branchLength * direction,
    };
  });
  const opacity = useDerivedValue(() => {
    const particle = particles.value[index];
    if (!particle?.active || particle.lifetimeMs <= 0) {
      return 0;
    }

    return Math.max(0, 1 - particle.ageMs / particle.lifetimeMs) ** 1.2;
  });
  const width = useDerivedValue(() => particles.value[index]?.width ?? 0);
  const glowWidth = useDerivedValue(() => width.value * 3.1);
  const coreColor = useDerivedValue(() => {
    const player = particles.value[index]?.playerId ?? 'bottom';
    return voltPalette.players[player].core;
  });
  const glowColor = useDerivedValue(() => {
    const player = particles.value[index]?.playerId ?? 'bottom';
    return voltPalette.players[player].glow;
  });

  return (
    <Group>
      <Line
        p1={start}
        p2={end}
        color={glowColor}
        opacity={opacity}
        style="stroke"
        strokeCap="square"
        strokeWidth={glowWidth}
      >
        <BlurMask blur={5} style="normal" />
      </Line>
      <Line
        p1={start}
        p2={end}
        color={coreColor}
        opacity={opacity}
        style="stroke"
        strokeCap="square"
        strokeWidth={width}
      />
      <Line
        p1={branchStart}
        p2={branchEnd}
        color={glowColor}
        opacity={opacity}
        style="stroke"
        strokeCap="square"
        strokeWidth={width}
      />
    </Group>
  );
}

const PARTICLE_INDICES = Array.from(
  { length: IMPACT_PARTICLE_POOL_SIZE },
  (_, index) => index,
);

export function VoltImpactParticles({
  particles,
}: ImpactParticlesRendererProps) {
  return (
    <Group>
      {PARTICLE_INDICES.map((index) => (
        <VoltImpactParticle key={index} index={index} particles={particles} />
      ))}
    </Group>
  );
}
