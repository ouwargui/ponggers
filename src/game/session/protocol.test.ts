import { describe, expect, test } from 'bun:test';

import {
  decodeSessionMessage,
  encodeSessionMessage,
  parseSessionMessage,
} from '@/game/session/protocol';
import type { GameSnapshotMessage } from '@/game/session/snapshot';

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
    expect(
      decodeSessionMessage(
        encodeSessionMessage({ type: 'rematch-request', id: 5 }),
      ),
    ).toEqual({ type: 'rematch-request', id: 5 });
  });

  test('round-trips an authoritative game snapshot', () => {
    const snapshot: GameSnapshotMessage = {
      type: 'game-snapshot',
      tick: 24,
      ball: {
        id: 'primary-ball',
        position: { x: 0.5, y: 0.4 },
        velocity: { x: 0.3, y: -0.4 },
      },
      lastImpact: null,
      paddles: {
        top: { centerX: 0.4, width: 0.32, velocityX: 0 },
        bottom: { centerX: 0.6, width: 0.32, velocityX: 0.2 },
      },
      match: {
        phase: { type: 'playing' },
        score: { top: 1, bottom: 2 },
        winningScore: 5,
        rallyStartedAtTick: 12,
      },
    };

    expect(decodeSessionMessage(encodeSessionMessage(snapshot))).toEqual(
      snapshot,
    );
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
    expect(parseSessionMessage({ type: 'rematch-request', id: -1 })).toBeNull();
  });
});
