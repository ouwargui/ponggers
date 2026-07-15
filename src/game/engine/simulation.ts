import {
  type BallCollisionShape,
  bounceBallFromPaddle,
  findPaddleHit,
  getBallImpactIntensity,
  type PaddleHit,
} from '@/game/engine/collisions';
import type {
  BallImpactEvent,
  BallState,
  GoalEvent,
  PaddleState,
  Vector2,
} from '@/game/engine/types';

export type CollisionWorld = {
  ballShape: BallCollisionShape;
  paddles: readonly PaddleState[];
};

export type BallStepResult = {
  ball: BallState;
  impact: BallImpactEvent | null;
  goal: GoalEvent | null;
};

function createImpactEvent(
  ball: BallState,
  world: CollisionWorld,
  surface: BallImpactEvent['surface'],
  normal: Vector2,
  tick: number,
): BallImpactEvent {
  'worklet';

  return {
    type: 'ball-impact',
    ballId: ball.id,
    surface,
    normal,
    intensity: getBallImpactIntensity(ball, world.ballShape),
    tick,
  };
}

export function stepBall(
  ball: BallState,
  world: CollisionWorld,
  deltaSeconds: number,
  tick: number,
): BallStepResult {
  'worklet';

  let velocityX = ball.velocity.x;
  let nextX = ball.position.x + velocityX * deltaSeconds;
  const nextY = ball.position.y + ball.velocity.y * deltaSeconds;
  let impact: BallImpactEvent | null = null;

  if (nextX <= world.ballShape.radiusX) {
    nextX = world.ballShape.radiusX;
    velocityX = Math.abs(velocityX);
    impact = createImpactEvent(ball, world, 'wall', { x: 1, y: 0 }, tick);
  } else if (nextX >= 1 - world.ballShape.radiusX) {
    nextX = 1 - world.ballShape.radiusX;
    velocityX = -Math.abs(velocityX);
    impact = createImpactEvent(ball, world, 'wall', { x: -1, y: 0 }, tick);
  }

  const nextPosition = { x: nextX, y: nextY };
  let earliestPaddleHit: PaddleHit | null = null;

  for (const paddle of world.paddles) {
    const hit = findPaddleHit(ball, nextPosition, paddle, world.ballShape);

    if (hit && (!earliestPaddleHit || hit.time < earliestPaddleHit.time)) {
      earliestPaddleHit = hit;
    }
  }

  if (earliestPaddleHit) {
    const ballAtImpact = {
      ...ball,
      velocity: { ...ball.velocity, x: velocityX },
    };

    return {
      ball: bounceBallFromPaddle(
        ballAtImpact,
        earliestPaddleHit,
        world.ballShape,
      ),
      impact: createImpactEvent(
        ballAtImpact,
        world,
        'paddle',
        { x: 0, y: earliestPaddleHit.paddle.id === 'top' ? 1 : -1 },
        tick,
      ),
      goal: null,
    };
  }

  if (nextY < 0 || nextY > 1) {
    const concededBy = nextY < 0 ? 'top' : 'bottom';

    return {
      ball: {
        ...ball,
        position: nextPosition,
        velocity: { ...ball.velocity, x: velocityX },
      },
      impact,
      goal: {
        type: 'goal',
        ballId: ball.id,
        scorer: concededBy === 'top' ? 'bottom' : 'top',
        concededBy,
        boundary: concededBy,
        tick,
      },
    };
  }

  return {
    ball: {
      ...ball,
      position: nextPosition,
      velocity: { ...ball.velocity, x: velocityX },
    },
    impact,
    goal: null,
  };
}
