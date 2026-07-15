import { describe, expect, test } from 'bun:test';

import type { PaddleState } from '@/game/engine/types';
import {
  LOCAL_MULTIPLAYER_SESSION,
  ONLINE_MULTIPLAYER_HOST_SESSION,
} from '@/game/session/definition';
import {
  applyPaddleLayout,
  createPaddleLayoutMessage,
  mapRemotePaddleLayout,
} from '@/game/session/paddle-layout';

const bottomPaddle: PaddleState = {
  id: 'bottom',
  centerX: 0.5,
  centerY: 0.93,
  width: 0.32,
  height: 0.02,
  velocityX: 0,
};

describe('online paddle layout', () => {
  test('mirrors the guest bottom layout onto the host remote top paddle', () => {
    const message = createPaddleLayoutMessage(bottomPaddle);

    expect(
      mapRemotePaddleLayout(ONLINE_MULTIPLAYER_HOST_SESSION, message),
    ).toEqual({
      ...message,
      playerId: 'top',
      centerY: 1 - bottomPaddle.centerY,
    });
  });

  test('does not create a remote layout for local multiplayer', () => {
    expect(
      mapRemotePaddleLayout(
        LOCAL_MULTIPLAYER_SESSION,
        createPaddleLayoutMessage(bottomPaddle),
      ),
    ).toBeNull();
  });

  test('applies only layout intended for that paddle', () => {
    const topPaddle = { ...bottomPaddle, id: 'top' as const, centerY: 0.05 };
    const layout = {
      type: 'paddle-layout' as const,
      playerId: 'top' as const,
      centerY: 0.07,
      height: 0.025,
    };

    expect(applyPaddleLayout(topPaddle, layout)).toEqual({
      ...topPaddle,
      centerY: 0.07,
      height: 0.025,
    });
    expect(applyPaddleLayout(bottomPaddle, layout)).toBe(bottomPaddle);
  });
});
