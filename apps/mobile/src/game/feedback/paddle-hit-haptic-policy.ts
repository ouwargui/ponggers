import type { BallImpactEvent, PlayerId } from '@/game/engine/types';

export type PaddleHitHapticStrength = 'light' | 'medium' | 'heavy';

export type PaddleHapticPlayers = Record<PlayerId, boolean>;

export function getPaddleHapticPlayers(enabled: boolean): PaddleHapticPlayers {
  return {
    top: enabled,
    bottom: enabled,
  };
}

export function getPaddleHitHapticStrength(
  intensity: number,
): PaddleHitHapticStrength {
  'worklet';

  if (intensity < 0.45) {
    return 'light';
  }

  if (intensity < 0.75) {
    return 'medium';
  }

  return 'heavy';
}

export function shouldPlayPaddleHitHaptic(
  impact: BallImpactEvent | null,
  previousImpact: BallImpactEvent | null,
  hapticPlayers: PaddleHapticPlayers,
): impact is BallImpactEvent & { playerId: PlayerId } {
  'worklet';

  if (
    impact?.surface !== 'paddle' ||
    impact.playerId === null ||
    !hapticPlayers[impact.playerId]
  ) {
    return false;
  }

  return !(
    previousImpact &&
    impact.tick === previousImpact.tick &&
    impact.ballId === previousImpact.ballId &&
    impact.playerId === previousImpact.playerId
  );
}
