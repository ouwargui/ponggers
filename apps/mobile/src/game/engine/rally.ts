import type { BallImpactEvent } from '@/game/engine/types';

export const RALLY_COUNTER_VISIBLE_FROM = 6;

export function recordRallyImpact(
  hitCount: number,
  impact: BallImpactEvent | null,
): number {
  'worklet';

  return impact?.surface === 'paddle' ? hitCount + 1 : hitCount;
}

export function getRallyCounterBaseScale(hitCount: number): number {
  'worklet';

  if (hitCount < RALLY_COUNTER_VISIBLE_FROM) {
    return 0;
  }

  return Math.min(1.55, 1 + (hitCount - RALLY_COUNTER_VISIBLE_FROM) * 0.025);
}

export function isRallyMilestone(hitCount: number): boolean {
  'worklet';

  return hitCount >= 10 && hitCount % 10 === 0;
}
