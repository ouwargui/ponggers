import {
  PADDLE_EDGE_GAP,
  PADDLE_HEIGHT_RATIO,
  PADDLE_VELOCITY_EPSILON,
  PADDLE_VELOCITY_HALF_LIFE_SECONDS,
  PADDLE_WIDTH_RATIO,
} from '@/game/constants';
import type { PaddleState, PlayerId } from '@/game/engine/types';

export function createPaddle(id: PlayerId): PaddleState {
  'worklet';

  return {
    id,
    centerX: 0.5,
    centerY: id === 'top' ? 0 : 1,
    width: PADDLE_WIDTH_RATIO,
    height: 0,
    velocityX: 0,
  };
}

export function layoutPaddle(
  paddle: PaddleState,
  arenaWidth: number,
  arenaHeight: number,
  edgeInset: number,
): PaddleState {
  'worklet';

  if (arenaWidth <= 0 || arenaHeight <= 0) {
    return paddle;
  }

  const height = (arenaWidth * PADDLE_HEIGHT_RATIO) / arenaHeight;
  const edgeOffset = (edgeInset + PADDLE_EDGE_GAP) / arenaHeight;

  return {
    ...paddle,
    centerY:
      paddle.id === 'top'
        ? edgeOffset + height / 2
        : 1 - edgeOffset - height / 2,
    height,
  };
}

export function resetPaddleForMatch(paddle: PaddleState): PaddleState {
  'worklet';

  const initialPaddle = createPaddle(paddle.id);

  return {
    ...paddle,
    centerX: initialPaddle.centerX,
    width: initialPaddle.width,
    velocityX: initialPaddle.velocityX,
  };
}

export function decayPaddleVelocity(
  paddle: PaddleState,
  deltaSeconds: number,
): PaddleState {
  'worklet';

  if (Math.abs(paddle.velocityX) <= PADDLE_VELOCITY_EPSILON) {
    return paddle.velocityX === 0 ? paddle : { ...paddle, velocityX: 0 };
  }

  const decayMultiplier =
    0.5 ** (deltaSeconds / PADDLE_VELOCITY_HALF_LIFE_SECONDS);
  const decayedVelocity = paddle.velocityX * decayMultiplier;

  return {
    ...paddle,
    velocityX:
      Math.abs(decayedVelocity) <= PADDLE_VELOCITY_EPSILON
        ? 0
        : decayedVelocity,
  };
}
