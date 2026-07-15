import { PADDLE_INPUT_SEND_INTERVAL_TICKS } from '@/game/constants';
import type { PaddleInput, PlayerId } from '@/game/engine/types';

type CreatePaddleInputOptions = {
  playerId: PlayerId;
  sequence: number;
  centerX: number;
  velocityX: number;
  clientTick: number;
};

export function createPaddleInput({
  playerId,
  sequence,
  centerX,
  velocityX,
  clientTick,
}: CreatePaddleInputOptions): PaddleInput {
  'worklet';

  return {
    type: 'paddle-input',
    playerId,
    sequence,
    centerX,
    velocityX,
    clientTick,
  };
}

export type SessionInput = PaddleInput;

export function shouldSendPaddleInput(
  clientTick: number,
  lastSentTick: number,
) {
  'worklet';

  return clientTick - lastSentTick >= PADDLE_INPUT_SEND_INTERVAL_TICKS;
}
