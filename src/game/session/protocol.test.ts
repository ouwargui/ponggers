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
    expect(
      decodeSessionMessage(
        encodeSessionMessage({ type: 'rematch-request', id: 5 }),
      ),
    ).toEqual({ type: 'rematch-request', id: 5 });
  });

  test('round-trips a paddle layout message', () => {
    const layout = {
      type: 'paddle-layout',
      playerId: 'bottom',
      centerY: 0.93,
      height: 0.02,
    } as const;

    expect(decodeSessionMessage(encodeSessionMessage(layout))).toEqual(layout);
  });

  test('round-trips rally authority events', () => {
    const returned = {
      type: 'shot-returned',
      rallyId: 3,
      shot: 4,
      playerRole: 'guest',
      ball: {
        id: 'primary-ball',
        position: { x: 0.4, y: 0.88 },
        velocity: { x: -0.2, y: -0.6 },
      },
      impact: {
        type: 'ball-impact',
        ballId: 'primary-ball',
        surface: 'paddle',
        playerId: 'bottom',
        normal: { x: 0, y: -1 },
        intensity: 0.8,
        tick: 900,
      },
    } as const;

    expect(decodeSessionMessage(encodeSessionMessage(returned))).toEqual(
      returned,
    );
    expect(
      decodeSessionMessage(
        encodeSessionMessage({
          type: 'point-conceded',
          rallyId: 3,
          shot: 4,
          playerRole: 'host',
        }),
      ),
    ).toEqual({
      type: 'point-conceded',
      rallyId: 3,
      shot: 4,
      playerRole: 'host',
    });
  });

  test('round-trips match recovery messages', () => {
    const request = {
      type: 'match-state-request',
      id: 99,
      playerRole: 'guest',
    } as const;
    const state = {
      type: 'match-state',
      requestId: 99,
      playerRole: 'host',
      tick: 600,
      authority: {
        status: 'playing',
        rallyId: 2,
        shot: 3,
        defenderRole: 'guest',
        nextServerRole: null,
      },
      ball: {
        id: 'primary-ball',
        position: { x: 0.4, y: 0.6 },
        velocity: { x: 0.2, y: -0.5 },
      },
      paddle: {
        id: 'bottom',
        centerX: 0.7,
        centerY: 0.92,
        width: 0.32,
        height: 0.02,
        velocityX: 0.1,
      },
      match: {
        phase: { type: 'playing' },
        score: { top: 1, bottom: 2 },
        winningScore: 5,
        rallyStartedAtTick: 500,
      },
      lastImpact: null,
    } as const;

    expect(decodeSessionMessage(encodeSessionMessage(request))).toEqual(
      request,
    );
    expect(decodeSessionMessage(encodeSessionMessage(state))).toEqual(state);
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
    expect(
      parseSessionMessage({
        type: 'paddle-layout',
        playerId: 'bottom',
        centerY: 1.2,
        height: 0.02,
      }),
    ).toBeNull();
    expect(
      parseSessionMessage({
        type: 'shot-returned',
        rallyId: 1,
        shot: 1,
        playerRole: 'guest',
        ball: {
          id: 'primary-ball',
          position: { x: 0.5, y: 0.9 },
          velocity: { x: 0, y: -0.5 },
        },
        impact: {
          type: 'ball-impact',
          ballId: 'primary-ball',
          surface: 'paddle',
          playerId: 'top',
          normal: { x: 0, y: 1 },
          intensity: 0.5,
          tick: 20,
        },
      }),
    ).toBeNull();
  });
});
