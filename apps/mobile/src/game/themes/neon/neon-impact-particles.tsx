import { BlurMask, Group, Line } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { IMPACT_PARTICLE_POOL_SIZE } from '@/game/presentation/impact-particles';
import { neonPalette } from '@/game/themes/neon/neon-tokens';
import type { ImpactParticlesRendererProps } from '@/game/themes/types';

function NeonImpactParticle({
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
  const opacity = useDerivedValue(() => {
    const particle = particles.value[index];

    if (!particle?.active || particle.lifetimeMs <= 0) {
      return 0;
    }

    const remaining = Math.max(0, 1 - particle.ageMs / particle.lifetimeMs);
    return remaining ** 1.35;
  });
  const coreWidth = useDerivedValue(() => particles.value[index]?.width ?? 0);
  const glowWidth = useDerivedValue(() => coreWidth.value * 3.6);
  const coreColor = useDerivedValue(() => {
    const playerId = particles.value[index]?.playerId ?? 'bottom';
    return neonPalette.players[playerId].core;
  });
  const glowColor = useDerivedValue(() => {
    const playerId = particles.value[index]?.playerId ?? 'bottom';
    return neonPalette.players[playerId].glow;
  });

  return (
    <Group>
      <Line
        p1={start}
        p2={end}
        color={glowColor}
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
        color={coreColor}
        opacity={opacity}
        style="stroke"
        strokeCap="round"
        strokeWidth={coreWidth}
      />
    </Group>
  );
}

const PARTICLE_INDICES = Array.from(
  { length: IMPACT_PARTICLE_POOL_SIZE },
  (_, index) => index,
);

export function NeonImpactParticles({
  particles,
}: ImpactParticlesRendererProps) {
  return (
    <Group>
      {PARTICLE_INDICES.map((index) => (
        <NeonImpactParticle key={index} index={index} particles={particles} />
      ))}
    </Group>
  );
}
