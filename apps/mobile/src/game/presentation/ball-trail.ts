import type { BallState, NormalizedPoint } from '@/game/engine/types';

const TRAIL_DURATION_MS = 160;
const MAX_TRAIL_POINTS = 24;
const MIN_SAMPLE_DISTANCE_SQUARED = 0.000001;
const MOVING_VELOCITY_SQUARED = 0.000001;

export type BallTrailPoint = NormalizedPoint & {
  recordedAt: number;
};

export function updateBallTrail(
  points: BallTrailPoint[],
  ball: BallState,
  timestamp: number,
): BallTrailPoint[] {
  'worklet';

  const velocitySquared =
    ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y;

  if (velocitySquared < MOVING_VELOCITY_SQUARED) {
    return points.length === 0 ? points : [];
  }

  const previousPoint = points[0];

  if (previousPoint) {
    const deltaX = ball.position.x - previousPoint.x;
    const deltaY = ball.position.y - previousPoint.y;

    if (deltaX * deltaX + deltaY * deltaY < MIN_SAMPLE_DISTANCE_SQUARED) {
      return points;
    }
  }

  const recentPoints = points.filter(
    (point) => timestamp - point.recordedAt <= TRAIL_DURATION_MS,
  );

  return [
    { ...ball.position, recordedAt: timestamp },
    ...recentPoints.slice(0, MAX_TRAIL_POINTS - 1),
  ];
}
