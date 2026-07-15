import type { PaddleState } from '@/game/engine/types';
import {
  type GameSessionDefinition,
  getRemotelyControlledPlayer,
} from '@/game/session/definition';
import type { PaddleLayoutMessage } from '@/game/session/protocol';

export function createPaddleLayoutMessage(
  paddle: PaddleState,
): PaddleLayoutMessage {
  'worklet';

  return {
    type: 'paddle-layout',
    playerId: paddle.id,
    centerY: paddle.centerY,
    height: paddle.height,
  };
}

export function mapRemotePaddleLayout(
  session: GameSessionDefinition,
  message: PaddleLayoutMessage,
): PaddleLayoutMessage | null {
  const remotePlayerId = getRemotelyControlledPlayer(session);

  if (!remotePlayerId) {
    return null;
  }

  const shouldMirror = message.playerId !== remotePlayerId;

  return {
    ...message,
    playerId: remotePlayerId,
    centerY: shouldMirror ? 1 - message.centerY : message.centerY,
  };
}

export function applyPaddleLayout(
  paddle: PaddleState,
  layout: PaddleLayoutMessage,
): PaddleState {
  'worklet';

  if (paddle.id !== layout.playerId) {
    return paddle;
  }

  return {
    ...paddle,
    centerY: layout.centerY,
    height: layout.height,
  };
}
