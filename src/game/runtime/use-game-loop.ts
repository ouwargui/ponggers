import { useCallback, useState } from 'react';
import {
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  BALL_RADIUS_RATIO,
  GAME_TICK_RATE,
  MAX_FRAME_TIME_SECONDS,
} from '@/game/constants';
import {
  advanceMatchPhase,
  createInitialMatchState,
  recordGoal,
} from '@/game/engine/match';
import { decayPaddleVelocity } from '@/game/engine/paddle';
import { createServe, createWaitingBall } from '@/game/engine/serve';
import { stepBall } from '@/game/engine/simulation';
import type {
  BallImpactEvent,
  BallState,
  MatchState,
  PaddleState,
} from '@/game/engine/types';
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
  const [matchSnapshot, setMatchSnapshot] = useState<MatchState>(() =>
    createInitialMatchState(),
  );
  const updateMatchSnapshot = useCallback((nextMatch: MatchState) => {
    setMatchSnapshot(nextMatch);
  }, []);
  const ball = useSharedValue<BallState>(createWaitingBall());
  const match = useSharedValue<MatchState>(matchSnapshot);
  const lastImpact = useSharedValue<BallImpactEvent | null>(null);
  const simulationTick = useSharedValue(0);
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
    let nextMatch = match.value;
    let nextTopPaddle = topPaddle.value;
    let nextBottomPaddle = bottomPaddle.value;
    let nextTick = simulationTick.value;
    let nextImpact: BallImpactEvent | null = null;
    let didResetBall = false;
    let didStep = false;
    const ballShape = {
      radiusX: BALL_RADIUS_RATIO,
      radiusY: (BALL_RADIUS_RATIO * width) / height,
    };

    while (accumulatedTime.value >= FIXED_STEP_SECONDS) {
      nextTick += 1;
      const previousPhase = nextMatch.phase;
      nextMatch = advanceMatchPhase(nextMatch, nextTick);

      if (
        previousPhase.type === 'countdown' &&
        nextMatch.phase.type === 'playing'
      ) {
        nextBall = createServe({ vertical: previousPhase.serveToward });
      }

      if (nextMatch.phase.type === 'playing') {
        const stepResult = stepBall(
          nextBall,
          {
            ballShape,
            paddles: [nextTopPaddle, nextBottomPaddle],
          },
          FIXED_STEP_SECONDS,
          nextTick,
        );
        nextBall = stepResult.ball;

        if (stepResult.impact) {
          nextImpact = stepResult.impact;
        }

        if (stepResult.goal) {
          nextMatch = recordGoal(nextMatch, stepResult.goal);
          nextBall = createWaitingBall();
          didResetBall = true;
        }
      }

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
      simulationTick.value = nextTick;

      if (nextMatch !== match.value) {
        match.value = nextMatch;
        scheduleOnRN(updateMatchSnapshot, nextMatch);
      }

      if (didResetBall) {
        lastImpact.value = null;
      } else if (nextImpact) {
        lastImpact.value = nextImpact;
      }

      if (nextTopPaddle.velocityX !== topPaddle.value.velocityX) {
        topPaddle.value = nextTopPaddle;
      }

      if (nextBottomPaddle.velocityX !== bottomPaddle.value.velocityX) {
        bottomPaddle.value = nextBottomPaddle;
      }
    }
  });

  return { ball, lastImpact, match: matchSnapshot };
}
