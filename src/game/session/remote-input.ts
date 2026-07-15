import {
  REMOTE_PADDLE_INTERPOLATION_EPSILON,
  REMOTE_PADDLE_INTERPOLATION_HALF_LIFE_SECONDS,
} from '@/game/constants';
import { applyPaddleInput } from '@/game/engine/paddle';
import type { PaddleInput, PaddleState } from '@/game/engine/types';
import {
  type GameSessionDefinition,
  getRemotelyControlledPlayer,
} from '@/game/session/definition';

const NO_SEQUENCE_RECEIVED = -1;

export type RemotePaddleInputInbox = {
  receive(input: PaddleInput): PaddleInput | null;
};

export function createRemotePaddleInputInbox(
  session: GameSessionDefinition,
): RemotePaddleInputInbox {
  const remotePlayerId = getRemotelyControlledPlayer(session);
  let lastSequence = NO_SEQUENCE_RECEIVED;

  return {
    receive(input) {
      if (!remotePlayerId || input.sequence <= lastSequence) {
        return null;
      }

      lastSequence = input.sequence;

      return input.playerId === remotePlayerId
        ? input
        : { ...input, playerId: remotePlayerId };
    },
  };
}

export function interpolateRemotePaddle(
  paddle: PaddleState,
  target: PaddleInput,
  deltaSeconds: number,
): PaddleState {
  'worklet';

  if (
    target.playerId !== paddle.id ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return paddle;
  }

  const distance = target.centerX - paddle.centerX;
  const blend =
    1 - 0.5 ** (deltaSeconds / REMOTE_PADDLE_INTERPOLATION_HALF_LIFE_SECONDS);
  const interpolatedCenterX = paddle.centerX + distance * blend;
  const centerX =
    Math.abs(target.centerX - interpolatedCenterX) <=
    REMOTE_PADDLE_INTERPOLATION_EPSILON
      ? target.centerX
      : interpolatedCenterX;

  return applyPaddleInput(paddle, {
    ...target,
    centerX,
  });
}
