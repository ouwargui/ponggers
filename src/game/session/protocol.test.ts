import { describe, expect, test } from 'bun:test';

import {
  decodeSessionMessage,
  encodeSessionMessage,
  parseSessionMessage,
} from '@/game/session/protocol';

describe('session protocol', () => {
  test('round-trips a paddle input through JSON', () => {
    const input = {
      type: 'paddle-input',
      playerId: 'bottom',
      sequence: 12,
      centerX: 0.63,
      velocityX: 0.8,
      clientTick: 480,
    } as const;

    expect(decodeSessionMessage(encodeSessionMessage(input))).toEqual(input);
  });

  test('round-trips ping and pong control messages', () => {
    expect(
      decodeSessionMessage(encodeSessionMessage({ type: 'ping', id: 4 })),
    ).toEqual({
      type: 'ping',
      id: 4,
    });
    expect(
      decodeSessionMessage(encodeSessionMessage({ type: 'pong', id: 4 })),
    ).toEqual({
      type: 'pong',
      id: 4,
    });
  });

  test('rejects malformed or non-finite remote input', () => {
    expect(decodeSessionMessage('{bad json')).toBeNull();
    expect(
      parseSessionMessage({
        type: 'paddle-input',
        playerId: 'bottom',
        sequence: -1,
        centerX: 0.5,
        velocityX: 0,
        clientTick: 20,
      }),
    ).toBeNull();
    expect(
      parseSessionMessage({
        type: 'paddle-input',
        playerId: 'bottom',
        sequence: 1,
        centerX: Number.NaN,
        velocityX: 0,
        clientTick: 20,
      }),
    ).toBeNull();
    expect(parseSessionMessage({ type: 'ping', id: -1 })).toBeNull();
    expect(parseSessionMessage({ type: 'pong', id: 1.5 })).toBeNull();
  });
});
