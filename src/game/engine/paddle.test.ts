import { describe, expect, test } from 'bun:test';

import { PADDLE_WIDTH_RATIO } from '@/game/constants';
import { applyPaddleInput, resetPaddleForMatch } from '@/game/engine/paddle';
import type { PaddleState } from '@/game/engine/types';

describe('resetPaddleForMatch', () => {
  test('restores gameplay values while preserving device layout', () => {
    const paddle: PaddleState = {
      id: 'top',
      centerX: 0.82,
      centerY: 0.06,
      width: 0.12,
      height: 0.02,
      velocityX: 1.4,
    };

    expect(resetPaddleForMatch(paddle)).toEqual({
      ...paddle,
      centerX: 0.5,
      width: PADDLE_WIDTH_RATIO,
      velocityX: 0,
    });
  });
});

describe('applyPaddleInput', () => {
  const paddle: PaddleState = {
    id: 'bottom',
    centerX: 0.5,
    centerY: 0.94,
    width: 0.3,
    height: 0.02,
    velocityX: 0,
  };

  test('applies normalized input and clamps it inside the arena', () => {
    expect(
      applyPaddleInput(paddle, {
        type: 'paddle-input',
        playerId: 'bottom',
        sequence: 4,
        centerX: 1.2,
        velocityX: 1.75,
        clientTick: 120,
      }),
    ).toEqual({
      ...paddle,
      centerX: 0.85,
      velocityX: 1.75,
    });
  });

  test('ignores input intended for another player', () => {
    expect(
      applyPaddleInput(paddle, {
        type: 'paddle-input',
        playerId: 'top',
        sequence: 5,
        centerX: 0.1,
        velocityX: -2,
        clientTick: 121,
      }),
    ).toBe(paddle);
  });

  test('does not allow non-finite network values into the simulation', () => {
    expect(
      applyPaddleInput(paddle, {
        type: 'paddle-input',
        playerId: 'bottom',
        sequence: 6,
        centerX: Number.NaN,
        velocityX: Number.POSITIVE_INFINITY,
        clientTick: 122,
      }),
    ).toEqual(paddle);
  });
});
