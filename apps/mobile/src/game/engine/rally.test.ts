import { describe, expect, test } from 'bun:test';

import {
  getRallyCounterBaseScale,
  isRallyMilestone,
  RALLY_COUNTER_VISIBLE_FROM,
  recordRallyImpact,
} from '@/game/engine/rally';
import type { BallImpactEvent } from '@/game/engine/types';

function createImpact(surface: BallImpactEvent['surface']): BallImpactEvent {
  return {
    type: 'ball-impact',
    ballId: 'primary-ball',
    surface,
    playerId: surface === 'paddle' ? 'bottom' : null,
    normal: { x: 0, y: -1 },
    intensity: 0.8,
    tick: 100,
  };
}

describe('rally progress', () => {
  test('counts paddle returns and ignores wall impacts', () => {
    expect(recordRallyImpact(5, createImpact('paddle'))).toBe(6);
    expect(recordRallyImpact(5, createImpact('wall'))).toBe(5);
    expect(recordRallyImpact(5, null)).toBe(5);
  });

  test('starts the counter at six and grows it with a visual cap', () => {
    expect(RALLY_COUNTER_VISIBLE_FROM).toBe(6);
    expect(getRallyCounterBaseScale(5)).toBe(0);
    expect(getRallyCounterBaseScale(6)).toBe(1);
    expect(getRallyCounterBaseScale(16)).toBe(1.25);
    expect(getRallyCounterBaseScale(100)).toBe(1.55);
  });

  test('marks every ten returns as a major rally milestone', () => {
    expect(isRallyMilestone(9)).toBe(false);
    expect(isRallyMilestone(10)).toBe(true);
    expect(isRallyMilestone(20)).toBe(true);
    expect(isRallyMilestone(21)).toBe(false);
  });
});
