import { describe, expect, test } from 'bun:test';

import type { BallImpactEvent } from '@/game/engine/types';
import {
  getPaddleImpactPose,
  getPaddleMotionPose,
  getPaddleSettlePose,
} from '@/game/presentation/paddle-presentation';

function createImpact(
  playerId: 'top' | 'bottom',
  intensity: number,
): BallImpactEvent {
  return {
    type: 'ball-impact',
    ballId: 'primary-ball',
    surface: 'paddle',
    playerId,
    normal: { x: 0, y: playerId === 'top' ? 1 : -1 },
    intensity,
    tick: 10,
  };
}

describe('paddle presentation', () => {
  test('stretches with speed while keeping the visual center predictable', () => {
    expect(getPaddleMotionPose(0)).toEqual({
      scaleX: 1,
      scaleY: 1,
      glowOffsetX: 0,
    });

    const fastRight = getPaddleMotionPose(10);
    expect(fastRight.scaleX).toBe(1.07);
    expect(fastRight.scaleY).toBe(0.955);
    expect(fastRight.glowOffsetX).toBe(-6);

    expect(getPaddleMotionPose(-10).glowOffsetX).toBe(6);
  });

  test('recoils each paddle away from the playing field on impact', () => {
    const top = getPaddleImpactPose(createImpact('top', 1));
    const bottom = getPaddleImpactPose(createImpact('bottom', 1));

    expect(top.shakeY).toBe(-4);
    expect(bottom.shakeY).toBe(4);
    expect(top.scaleX).toBe(1.04);
    expect(top.scaleY).toBe(0.86);
    expect(top.glowPulse).toBe(1.75);
  });

  test('turns stored movement speed into a visible but bounded settle', () => {
    expect(getPaddleSettlePose(0)).toEqual({ scaleX: 1, scaleY: 1 });
    expect(getPaddleSettlePose(10)).toEqual({
      scaleX: 0.955,
      scaleY: 1.07,
    });

    const slowSettle = getPaddleSettlePose(0.1);
    expect(slowSettle.scaleX).toBeCloseTo(0.98425);
    expect(slowSettle.scaleY).toBeCloseTo(1.0245);
  });

  test('clamps malformed impact intensity to a safe visual range', () => {
    expect(getPaddleImpactPose(createImpact('bottom', 5)).glowPulse).toBe(1.75);
    expect(getPaddleImpactPose(createImpact('bottom', -2)).glowPulse).toBe(1);
  });
});
