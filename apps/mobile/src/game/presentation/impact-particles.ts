import type { PlayerId } from '@/game/engine/types';

export const IMPACT_PARTICLE_POOL_SIZE = 18;

const MIN_PARTICLE_COUNT = 5;
const PARTICLE_COUNT_RANGE = 10;

export type ImpactParticle = {
  active: boolean;
  ageMs: number;
  lifetimeMs: number;
  playerId: PlayerId;
  tailDurationSeconds: number;
  velocityX: number;
  velocityY: number;
  width: number;
  x: number;
  y: number;
};

export function getImpactParticleCount(intensity: number): number {
  'worklet';

  const safeIntensity = Math.max(0, Math.min(intensity, 1));
  return MIN_PARTICLE_COUNT + Math.round(safeIntensity * PARTICLE_COUNT_RANGE);
}

export function createInactiveImpactParticle(): ImpactParticle {
  'worklet';

  return {
    active: false,
    ageMs: 0,
    lifetimeMs: 1,
    playerId: 'bottom',
    tailDurationSeconds: 0,
    velocityX: 0,
    velocityY: 0,
    width: 0,
    x: 0,
    y: 0,
  };
}
