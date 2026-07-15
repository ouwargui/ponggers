import {
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import {
  BALL_RADIUS_RATIO,
  GAME_TICK_RATE,
  MAX_FRAME_TIME_SECONDS,
} from '@/game/constants';
import { decayPaddleVelocity } from '@/game/engine/paddle';
import { createServe } from '@/game/engine/serve';
import { stepBall } from '@/game/engine/simulation';
import type { BallState, PaddleState } from '@/game/engine/types';
import type { CanvasSize } from '@/game/rendering/types';

const FIXED_STEP_SECONDS = 1 / GAME_TICK_RATE;

type GameLoopOptions = {
  canvasSize: SharedValue<CanvasSize>;
  topPaddle: SharedValue<PaddleState>;
  bottomPaddle: SharedValue<PaddleState>;
};

export function useGameLoop({
  canvasSize,
  topPaddle,
  bottomPaddle,
}: GameLoopOptions) {
  const ball = useSharedValue<BallState>(createServe());
  const accumulatedTime = useSharedValue(0);

  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (timeSincePreviousFrame === null) {
      return;
    }

    const { width, height } = canvasSize.value;

    if (width <= 0 || height <= 0) {
      return;
    }

    const frameTimeSeconds = Math.min(
      timeSincePreviousFrame / 1000,
      MAX_FRAME_TIME_SECONDS,
    );

    accumulatedTime.value += frameTimeSeconds;

    let nextBall = ball.value;
    let nextTopPaddle = topPaddle.value;
    let nextBottomPaddle = bottomPaddle.value;
    let didStep = false;
    const ballShape = {
      radiusX: BALL_RADIUS_RATIO,
      radiusY: (BALL_RADIUS_RATIO * width) / height,
    };

    while (accumulatedTime.value >= FIXED_STEP_SECONDS) {
      nextBall = stepBall(
        nextBall,
        {
          ballShape,
          paddles: [nextTopPaddle, nextBottomPaddle],
        },
        FIXED_STEP_SECONDS,
      );
      nextTopPaddle = decayPaddleVelocity(nextTopPaddle, FIXED_STEP_SECONDS);
      nextBottomPaddle = decayPaddleVelocity(
        nextBottomPaddle,
        FIXED_STEP_SECONDS,
      );
      accumulatedTime.value -= FIXED_STEP_SECONDS;
      didStep = true;
    }

    if (didStep) {
      ball.value = nextBall;

      if (nextTopPaddle.velocityX !== topPaddle.value.velocityX) {
        topPaddle.value = nextTopPaddle;
      }

      if (nextBottomPaddle.velocityX !== bottomPaddle.value.velocityX) {
        bottomPaddle.value = nextBottomPaddle;
      }
    }
  });

  return { ball };
}
