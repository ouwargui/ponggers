import {
  type SharedValue,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { BALL_RADIUS_RATIO } from '@/game/constants';
import type { BallImpactEvent, BallState } from '@/game/engine/types';
import {
  createInactiveImpactParticle,
  getImpactParticleCount,
  IMPACT_PARTICLE_POOL_SIZE,
  type ImpactParticle,
} from '@/game/presentation/impact-particles';
import type { CanvasSize } from '@/game/rendering/types';

function noise(seed: number): number {
  'worklet';

  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function useImpactParticles(
  ball: SharedValue<BallState>,
  lastImpact: SharedValue<BallImpactEvent | null>,
  canvasSize: SharedValue<CanvasSize>,
): SharedValue<ImpactParticle[]> {
  const particles = useSharedValue<ImpactParticle[]>(
    Array.from({ length: IMPACT_PARTICLE_POOL_SIZE }, () =>
      createInactiveImpactParticle(),
    ),
  );
  const nextParticleIndex = useSharedValue(0);

  useAnimatedReaction(
    () => lastImpact.value,
    (impact, previousImpact) => {
      if (
        impact?.surface !== 'paddle' ||
        impact.playerId === null ||
        (previousImpact &&
          impact.tick === previousImpact.tick &&
          impact.ballId === previousImpact.ballId)
      ) {
        return;
      }

      const { width, height } = canvasSize.value;

      if (width <= 0 || height <= 0) {
        return;
      }

      const currentBall = ball.value;
      const radius = width * BALL_RADIUS_RATIO;
      const originX = currentBall.position.x * width;
      const originY =
        currentBall.position.y * height - impact.normal.y * radius;
      const intensity = Math.max(0, Math.min(impact.intensity, 1));
      const count = getImpactParticleCount(intensity);
      const next = particles.value.slice();

      for (let index = 0; index < count; index += 1) {
        const poolIndex =
          (nextParticleIndex.value + index) % IMPACT_PARTICLE_POOL_SIZE;
        const seed =
          impact.tick * 31 + index * 17 + (impact.playerId === 'top' ? 7 : 13);
        const spread = noise(seed);
        const speedNoise = noise(seed + 1.7);
        const lifetimeNoise = noise(seed + 3.1);
        const longStreak = intensity >= 0.72 && index < 2;
        const verticalSpeed = 190 + speedNoise * 230 + intensity * 170;
        const horizontalSpread = 150 + intensity * 280;
        const ballInfluence = currentBall.velocity.x * width * 0.12;

        next[poolIndex] = {
          active: true,
          ageMs: 0,
          lifetimeMs:
            (longStreak ? 250 : 180) + lifetimeNoise * (longStreak ? 110 : 140),
          playerId: impact.playerId,
          tailDurationSeconds: longStreak ? 0.052 : 0.024,
          velocityX: (spread * 2 - 1) * horizontalSpread + ballInfluence,
          velocityY: impact.normal.y * verticalSpeed,
          width: longStreak ? 2.2 : 1.25 + speedNoise * 0.65,
          x: originX,
          y: originY,
        };
      }

      nextParticleIndex.value =
        (nextParticleIndex.value + count) % IMPACT_PARTICLE_POOL_SIZE;
      particles.value = next;
    },
  );

  useFrameCallback(({ timeSincePreviousFrame }) => {
    const deltaMs = Math.min(timeSincePreviousFrame ?? 0, 32);

    if (deltaMs <= 0 || !particles.value.some((particle) => particle.active)) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const drag = 0.975 ** (deltaMs / 16.67);
    const gravity = 260;

    particles.value = particles.value.map((particle) => {
      if (!particle.active) {
        return particle;
      }

      const ageMs = particle.ageMs + deltaMs;

      if (ageMs >= particle.lifetimeMs) {
        return { ...particle, active: false, ageMs };
      }

      const velocityX = particle.velocityX * drag;
      const velocityY = particle.velocityY * drag + gravity * deltaSeconds;

      return {
        ...particle,
        ageMs,
        velocityX,
        velocityY,
        x: particle.x + velocityX * deltaSeconds,
        y: particle.y + velocityY * deltaSeconds,
      };
    });
  });

  return particles;
}
