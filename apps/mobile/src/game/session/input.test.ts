import { expect, test } from 'bun:test';

import { createPaddleInput, shouldSendPaddleInput } from '@/game/session/input';

test('createPaddleInput creates a transport-ready normalized message', () => {
  expect(
    createPaddleInput({
      playerId: 'top',
      sequence: 9,
      centerX: 0.42,
      velocityX: -0.7,
      clientTick: 340,
    }),
  ).toEqual({
    type: 'paddle-input',
    playerId: 'top',
    sequence: 9,
    centerX: 0.42,
    velocityX: -0.7,
    clientTick: 340,
  });
});

test('shouldSendPaddleInput limits the network outbox to 30 Hz', () => {
  expect(shouldSendPaddleInput(100, 96)).toBe(true);
  expect(shouldSendPaddleInput(103, 100)).toBe(false);
  expect(shouldSendPaddleInput(104, 100)).toBe(true);
});
