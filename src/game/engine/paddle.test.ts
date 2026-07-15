/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { PADDLE_WIDTH_RATIO } from '@/game/constants';
import { resetPaddleForMatch } from '@/game/engine/paddle';
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

    assert.deepEqual(resetPaddleForMatch(paddle), {
      ...paddle,
      centerX: 0.5,
      width: PADDLE_WIDTH_RATIO,
      velocityX: 0,
    });
  });
});
