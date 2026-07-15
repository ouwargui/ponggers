import {
  type BallCollisionShape,
  bounceBallFromPaddle,
  findPaddleHit,
  type PaddleHit,
} from '@/game/engine/collisions';
import { createServe } from '@/game/engine/serve';
import type { BallState, PaddleState } from '@/game/engine/types';

export type CollisionWorld = {
  ballShape: BallCollisionShape;
  paddles: readonly PaddleState[];
};

export function stepBall(
  ball: BallState,
  world: CollisionWorld,
  deltaSeconds: number,
): BallState {
  'worklet';

  let velocityX = ball.velocity.x;
  let nextX = ball.position.x + velocityX * deltaSeconds;
  const nextY = ball.position.y + ball.velocity.y * deltaSeconds;

  if (nextX <= world.ballShape.radiusX) {
    nextX = world.ballShape.radiusX;
    velocityX = Math.abs(velocityX);
  } else if (nextX >= 1 - world.ballShape.radiusX) {
    nextX = 1 - world.ballShape.radiusX;
    velocityX = -Math.abs(velocityX);
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
    return bounceBallFromPaddle(
      {
        ...ball,
        velocity: { ...ball.velocity, x: velocityX },
      },
      earliestPaddleHit,
      world.ballShape,
    );
  }

  if (nextY < 0 || nextY > 1) {
    return createServe({
      horizontal: velocityX >= 0 ? 'left' : 'right',
      vertical: nextY > 1 ? 'top' : 'bottom',
    });
  }

  return {
    ...ball,
    position: nextPosition,
    velocity: { ...ball.velocity, x: velocityX },
  };
}
