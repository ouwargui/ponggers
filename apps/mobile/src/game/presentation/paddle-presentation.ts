import type { BallImpactEvent } from '@/game/engine/types';

const FULL_STRETCH_VELOCITY = 2.5;
const MAX_HORIZONTAL_STRETCH = 0.07;
const MAX_VERTICAL_SQUASH = 0.045;
export const PADDLE_MAX_GLOW_TRAIL_OFFSET = 6;

export const PASSIVE_PADDLE_SETTLE_VELOCITY = 0.12;

export type PaddleMotionPose = {
  scaleX: number;
  scaleY: number;
  glowOffsetX: number;
};

export type PaddleImpactPose = {
  scaleX: number;
  scaleY: number;
  shakeX: number;
  shakeY: number;
  glowPulse: number;
};

export type PaddleSettlePose = {
  scaleX: number;
  scaleY: number;
};

export function getPaddleMotionPose(velocityX: number): PaddleMotionPose {
  'worklet';

  const safeVelocity = Number.isFinite(velocityX) ? velocityX : 0;
  const speedRatio = Math.min(
    Math.abs(safeVelocity) / FULL_STRETCH_VELOCITY,
    1,
  );

  return {
    scaleX: 1 + speedRatio * MAX_HORIZONTAL_STRETCH,
    scaleY: 1 - speedRatio * MAX_VERTICAL_SQUASH,
    glowOffsetX:
      speedRatio === 0
        ? 0
        : -Math.sign(safeVelocity) * speedRatio * PADDLE_MAX_GLOW_TRAIL_OFFSET,
  };
}

export function getPaddleImpactPose(impact: BallImpactEvent): PaddleImpactPose {
  'worklet';

  const intensity = Math.max(0, Math.min(impact.intensity, 1));
  const horizontalShakeDirection = impact.tick % 2 === 0 ? 1 : -1;

  return {
    scaleX: 1 + intensity * 0.04,
    scaleY: 1 - intensity * 0.14,
    shakeX: horizontalShakeDirection * intensity * 1.2,
    shakeY: -impact.normal.y * (2 + intensity * 2),
    glowPulse: 1 + intensity * 0.75,
  };
}

export function getPaddleSettlePose(velocityX: number): PaddleSettlePose {
  'worklet';

  const safeVelocity = Number.isFinite(velocityX) ? velocityX : 0;
  const speedRatio = Math.min(
    Math.abs(safeVelocity) / FULL_STRETCH_VELOCITY,
    1,
  );
  const settleStrength = speedRatio === 0 ? 0 : Math.max(0.35, speedRatio);

  return {
    scaleX: 1 - settleStrength * 0.045,
    scaleY: 1 + settleStrength * 0.07,
  };
}
