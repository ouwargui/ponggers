import { useCallback, useState } from 'react';
import {
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  BALL_RADIUS_RATIO,
  GAME_TICK_RATE,
  MAX_FRAME_TIME_SECONDS,
} from '@/game/constants';
import {
  advanceMatchPhase,
  createInitialMatchState,
  getCountdownValue,
  recordGoal,
} from '@/game/engine/match';
import { decayPaddleVelocity, resetPaddleForMatch } from '@/game/engine/paddle';
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

type GameLoopSnapshot = {
  match: MatchState;
  countdown: number | null;
};

export function useGameLoop({
  canvasSize,
  topPaddle,
  bottomPaddle,
}: GameLoopOptions) {
  const [snapshot, setSnapshot] = useState<GameLoopSnapshot>(() => {
    const match = createInitialMatchState();
    return { match, countdown: getCountdownValue(match, 0) };
  });
  const updateSnapshot = useCallback(
    (nextMatch: MatchState, countdown: number | null) => {
      setSnapshot({ match: nextMatch, countdown });
    },
    [],
  );
  const ball = useSharedValue<BallState>(createWaitingBall());
  const match = useSharedValue<MatchState>(snapshot.match);
  const countdown = useSharedValue<number | null>(snapshot.countdown);
  const lastImpact = useSharedValue<BallImpactEvent | null>(null);
  const simulationTick = useSharedValue(0);
  const accumulatedTime = useSharedValue(0);

  const restartMatch = useCallback(() => {
    scheduleOnUI(() => {
      'worklet';

      const nextMatch = createInitialMatchState(simulationTick.value);
      const nextCountdown = getCountdownValue(nextMatch, simulationTick.value);

      accumulatedTime.value = 0;
      ball.value = createWaitingBall();
      countdown.value = nextCountdown;
      lastImpact.value = null;
      topPaddle.value = resetPaddleForMatch(topPaddle.value);
      bottomPaddle.value = resetPaddleForMatch(bottomPaddle.value);
      match.value = nextMatch;
      scheduleOnRN(updateSnapshot, nextMatch, nextCountdown);
    });
  }, [
    accumulatedTime,
    ball,
    bottomPaddle,
    countdown,
    lastImpact,
    match,
    simulationTick,
    topPaddle,
    updateSnapshot,
  ]);

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

      const didMatchChange = nextMatch !== match.value;
      const nextCountdown = getCountdownValue(nextMatch, nextTick);
      const didCountdownChange = nextCountdown !== countdown.value;

      if (didMatchChange) {
        match.value = nextMatch;
      }

      if (didCountdownChange) {
        countdown.value = nextCountdown;
      }

      if (didMatchChange || didCountdownChange) {
        scheduleOnRN(updateSnapshot, nextMatch, nextCountdown);
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

  return {
    ball,
    countdown: snapshot.countdown,
    lastImpact,
    match: snapshot.match,
    restartMatch,
    simulationTick,
  };
}
