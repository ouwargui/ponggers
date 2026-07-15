import { describe, expect, test } from 'bun:test';

import { REPLICA_INTERPOLATION_HALF_LIFE_SECONDS } from '@/game/constants';
import type { PaddleState } from '@/game/engine/types';
import {
  applyReplicaPaddle,
  createGameSnapshotInbox,
  type GameSnapshotMessage,
  interpolateReplicaBall,
  parseGameSnapshotMessage,
  transformSnapshotForGuest,
} from '@/game/session/snapshot';

function createSnapshot(tick = 120): GameSnapshotMessage {
  return {
    type: 'game-snapshot',
    tick,
    ball: {
      id: 'primary-ball',
      position: { x: 0.3, y: 0.25 },
      velocity: { x: 0.4, y: -0.5 },
    },
    lastImpact: {
      type: 'ball-impact',
      ballId: 'primary-ball',
      surface: 'paddle',
      playerId: 'top',
      normal: { x: 0, y: 1 },
      intensity: 0.7,
      tick: 119,
    },
    paddles: {
      top: { centerX: 0.2, width: 0.3, velocityX: -0.4 },
      bottom: { centerX: 0.8, width: 0.25, velocityX: 0.6 },
    },
    match: {
      phase: {
        type: 'point-scored',
        scorer: 'top',
        concededBy: 'bottom',
        endsAtTick: 180,
      },
      score: { top: 2, bottom: 1 },
      winningScore: 5,
      rallyStartedAtTick: null,
    },
  };
}

describe('authoritative game snapshots', () => {
  test('mirrors the host world into the guest point of view', () => {
    const guest = transformSnapshotForGuest(createSnapshot());

    expect(guest.ball.position).toEqual({ x: 0.3, y: 0.75 });
    expect(guest.ball.velocity).toEqual({ x: 0.4, y: 0.5 });
    expect(guest.lastImpact).toEqual({
      type: 'ball-impact',
      ballId: 'primary-ball',
      surface: 'paddle',
      playerId: 'bottom',
      normal: { x: 0, y: -1 },
      intensity: 0.7,
      tick: 119,
    });
    expect(guest.paddles).toEqual({
      top: { centerX: 0.8, width: 0.25, velocityX: 0.6 },
      bottom: { centerX: 0.2, width: 0.3, velocityX: -0.4 },
    });
    expect(guest.match.score).toEqual({ top: 1, bottom: 2 });
    expect(guest.match.phase).toEqual({
      type: 'point-scored',
      scorer: 'bottom',
      concededBy: 'top',
      endsAtTick: 180,
    });
  });

  test('rejects stale and out-of-order snapshots', () => {
    const inbox = createGameSnapshotInbox();

    expect(inbox.receive(createSnapshot(10))?.tick).toBe(10);
    expect(inbox.receive(createSnapshot(10))).toBeNull();
    expect(inbox.receive(createSnapshot(9))).toBeNull();
    expect(inbox.receive(createSnapshot(11))?.tick).toBe(11);
  });

  test('validates untrusted snapshot fields', () => {
    expect(parseGameSnapshotMessage(createSnapshot())).not.toBeNull();
    expect(
      parseGameSnapshotMessage({
        ...createSnapshot(),
        ball: {
          ...createSnapshot().ball,
          position: { x: Number.NaN, y: 0.5 },
        },
      }),
    ).toBeNull();
  });

  test('interpolates replica ball position without changing authority velocity', () => {
    const current = {
      ...createSnapshot().ball,
      position: { x: 0.1, y: 0.1 },
    };
    const target = {
      ...createSnapshot().ball,
      position: { x: 0.7, y: 0.5 },
    };
    const next = interpolateReplicaBall(
      current,
      target,
      REPLICA_INTERPOLATION_HALF_LIFE_SECONDS,
    );

    expect(next.position.x).toBeCloseTo(0.4);
    expect(next.position.y).toBeCloseTo(0.3);
    expect(next.velocity).toEqual(target.velocity);
  });

  test('interpolates only device-independent paddle state', () => {
    const current: PaddleState = {
      id: 'top',
      centerX: 0.2,
      centerY: 0.08,
      width: 0.32,
      height: 0.02,
      velocityX: 0,
    };
    const next = applyReplicaPaddle(
      current,
      { centerX: 0.8, width: 0.25, velocityX: 1.1 },
      REPLICA_INTERPOLATION_HALF_LIFE_SECONDS,
    );

    expect(next.centerX).toBeCloseTo(0.5);
    expect(next.centerY).toBe(current.centerY);
    expect(next.height).toBe(current.height);
    expect(next.width).toBe(0.25);
    expect(next.velocityX).toBe(1.1);
  });
});
