import { describe, expect, test } from 'bun:test';
import { REMOTE_PADDLE_INTERPOLATION_HALF_LIFE_SECONDS } from '@/game/constants';
import type { PaddleInput, PaddleState } from '@/game/engine/types';
import {
  LOCAL_MULTIPLAYER_SESSION,
  ONLINE_MULTIPLAYER_SESSION,
} from '@/game/session/definition';
import {
  createRemotePaddleInputInbox,
  interpolateRemotePaddle,
} from '@/game/session/remote-input';

function createInput(
  playerId: PaddleInput['playerId'],
  sequence: number,
): PaddleInput {
  return {
    type: 'paddle-input',
    playerId,
    sequence,
    centerX: 0.4,
    velocityX: -0.2,
    clientTick: 120,
  };
}

describe('remote paddle input inbox', () => {
  test('maps the peer local paddle onto the remote paddle', () => {
    const inbox = createRemotePaddleInputInbox(ONLINE_MULTIPLAYER_SESSION);
    const input = createInput('bottom', 1);

    expect(inbox.receive(input)).toEqual({ ...input, playerId: 'top' });
  });

  test('rejects input when the session has no remote paddle', () => {
    const inbox = createRemotePaddleInputInbox(LOCAL_MULTIPLAYER_SESSION);

    expect(inbox.receive(createInput('bottom', 1))).toBeNull();
  });

  test('rejects duplicate and out-of-order input', () => {
    const inbox = createRemotePaddleInputInbox(ONLINE_MULTIPLAYER_SESSION);

    expect(inbox.receive(createInput('top', 4))).not.toBeNull();
    expect(inbox.receive(createInput('top', 4))).toBeNull();
    expect(inbox.receive(createInput('top', 3))).toBeNull();
    expect(inbox.receive(createInput('top', 5))).not.toBeNull();
  });
});

describe('remote paddle interpolation', () => {
  const paddle: PaddleState = {
    id: 'top',
    centerX: 0.2,
    centerY: 0.05,
    width: 0.3,
    height: 0.02,
    velocityX: 0,
  };

  test('covers half the remaining distance each half-life', () => {
    const next = interpolateRemotePaddle(
      paddle,
      { ...createInput('top', 1), centerX: 0.8, velocityX: 1.2 },
      REMOTE_PADDLE_INTERPOLATION_HALF_LIFE_SECONDS,
    );

    expect(next.centerX).toBeCloseTo(0.5);
    expect(next.velocityX).toBe(1.2);
  });

  test('converges on the target without overshooting', () => {
    const target = { ...createInput('top', 1), centerX: 0.8 };
    let next = paddle;

    for (let frame = 0; frame < 30; frame += 1) {
      next = interpolateRemotePaddle(next, target, 1 / 60);
      expect(next.centerX).toBeLessThanOrEqual(target.centerX);
    }

    expect(next.centerX).toBe(target.centerX);
  });

  test('ignores targets for another paddle', () => {
    expect(
      interpolateRemotePaddle(paddle, createInput('bottom', 1), 1 / 60),
    ).toBe(paddle);
  });
});
