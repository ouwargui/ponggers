import { describe, expect, test } from 'bun:test';

import {
  type MatchStateMessage,
  parseMatchStateMessage,
  transformMatchStateForPeer,
} from '@/game/session/recovery';

function createState(): MatchStateMessage {
  return {
    type: 'match-state',
    requestId: 42,
    playerRole: 'host',
    tick: 500,
    authority: {
      status: 'playing',
      rallyId: 3,
      shot: 4,
      defenderRole: 'guest',
      nextServerRole: null,
    },
    ball: {
      id: 'primary-ball',
      position: { x: 0.4, y: 0.25 },
      velocity: { x: 0.2, y: -0.6 },
    },
    paddle: {
      id: 'bottom',
      centerX: 0.7,
      centerY: 0.92,
      width: 0.32,
      height: 0.02,
      velocityX: 0.5,
    },
    match: {
      phase: { type: 'playing' },
      score: { top: 1, bottom: 2 },
      winningScore: 5,
      rallyStartedAtTick: 400,
    },
    lastImpact: {
      type: 'ball-impact',
      ballId: 'primary-ball',
      surface: 'paddle',
      playerId: 'top',
      normal: { x: 0, y: 1 },
      intensity: 0.8,
      tick: 480,
    },
  };
}

describe('online match recovery', () => {
  test('validates a complete match checkpoint', () => {
    expect(parseMatchStateMessage(createState())).toEqual(createState());
  });

  test('mirrors viewport state while preserving canonical rally authority', () => {
    const state = createState();
    const peer = transformMatchStateForPeer(state);

    expect(peer.authority).toEqual(state.authority);
    expect(peer.ball.position).toEqual({ x: 0.4, y: 0.75 });
    expect(peer.ball.velocity).toEqual({ x: 0.2, y: 0.6 });
    expect(peer.paddle.id).toBe('top');
    expect(peer.paddle.centerX).toBe(state.paddle.centerX);
    expect(peer.paddle.centerY).toBeCloseTo(0.08);
    expect(peer.paddle.width).toBe(state.paddle.width);
    expect(peer.match.score).toEqual({ top: 2, bottom: 1 });
    expect(peer.lastImpact).toEqual({
      type: 'ball-impact',
      ballId: 'primary-ball',
      surface: 'paddle',
      playerId: 'bottom',
      normal: { x: 0, y: -1 },
      intensity: 0.8,
      tick: 480,
    });
  });

  test('rejects internally inconsistent authority state', () => {
    expect(
      parseMatchStateMessage({
        ...createState(),
        authority: {
          ...createState().authority,
          defenderRole: null,
        },
      }),
    ).toBeNull();
  });
});
