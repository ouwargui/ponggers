import {
  PADDLE_MAX_BOUNCE_ANGLE,
  PADDLE_VELOCITY_INFLUENCE,
} from '@/game/constants';
import type {
  BallState,
  NormalizedPoint,
  PaddleState,
} from '@/game/engine/types';

export type BallCollisionShape = {
  radiusX: number;
  radiusY: number;
};

export type PaddleHit = {
  position: NormalizedPoint;
  paddle: PaddleState;
  time: number;
};

export function findPaddleHit(
  ball: BallState,
  nextPosition: NormalizedPoint,
  paddle: PaddleState,
  ballShape: BallCollisionShape,
): PaddleHit | null {
  'worklet';

  const isTopPaddle = paddle.id === 'top';
  const isApproaching = isTopPaddle ? ball.velocity.y < 0 : ball.velocity.y > 0;

  if (!isApproaching || paddle.width <= 0 || paddle.height <= 0) {
    return null;
  }

  const paddleFaceY = isTopPaddle
    ? paddle.centerY + paddle.height / 2 + ballShape.radiusY
    : paddle.centerY - paddle.height / 2 - ballShape.radiusY;
  const crossedPaddleFace = isTopPaddle
    ? ball.position.y >= paddleFaceY && nextPosition.y <= paddleFaceY
    : ball.position.y <= paddleFaceY && nextPosition.y >= paddleFaceY;

  if (!crossedPaddleFace) {
    return null;
  }

  const deltaY = nextPosition.y - ball.position.y;

  if (deltaY === 0) {
    return null;
  }

  const time = (paddleFaceY - ball.position.y) / deltaY;
  const hitX = ball.position.x + (nextPosition.x - ball.position.x) * time;
  const paddleLeft = paddle.centerX - paddle.width / 2 - ballShape.radiusX;
  const paddleRight = paddle.centerX + paddle.width / 2 + ballShape.radiusX;

  if (hitX < paddleLeft || hitX > paddleRight) {
    return null;
  }

  return {
    position: { x: hitX, y: paddleFaceY },
    paddle,
    time,
  };
}

export function bounceBallFromPaddle(
  ball: BallState,
  hit: PaddleHit,
  ballShape: BallCollisionShape,
): BallState {
  'worklet';

  const hitOffset =
    (hit.position.x - hit.paddle.centerX) / (hit.paddle.width / 2);
  const normalizedOffset = Math.max(-1, Math.min(hitOffset, 1));
  const bounceAngle = normalizedOffset * PADDLE_MAX_BOUNCE_ANGLE;
  const heightToWidthRatio = ballShape.radiusX / ballShape.radiusY;
  const velocityYInWidthUnits = ball.velocity.y * heightToWidthRatio;
  const speed = Math.hypot(ball.velocity.x, velocityYInWidthUnits);
  const paddleInfluence = hit.paddle.velocityX * PADDLE_VELOCITY_INFLUENCE;
  const maximumVelocityX = speed * Math.sin(PADDLE_MAX_BOUNCE_ANGLE);
  const velocityX = Math.max(
    -maximumVelocityX,
    Math.min(Math.sin(bounceAngle) * speed + paddleInfluence, maximumVelocityX),
  );
  const velocityYInWidthUnitsAfterBounce = Math.sqrt(
    Math.max(speed * speed - velocityX * velocityX, 0),
  );
  const verticalDirection = hit.paddle.id === 'top' ? 1 : -1;

  return {
    ...ball,
    position: hit.position,
    velocity: {
      x: velocityX,
      y:
        (velocityYInWidthUnitsAfterBounce / heightToWidthRatio) *
        verticalDirection,
    },
  };
}
