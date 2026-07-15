import { useCallback, useState } from 'react';
import {
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  BALL_RADIUS_RATIO,
  GAME_SNAPSHOT_SEND_INTERVAL_TICKS,
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
  MatchPhase,
  MatchState,
  PaddleState,
} from '@/game/engine/types';
import type { CanvasSize } from '@/game/rendering/types';
import {
  applyReplicaPaddle,
  createGameSnapshotMessage,
  type GameSnapshotMessage,
  interpolateReplicaBall,
} from '@/game/session/snapshot';

const FIXED_STEP_SECONDS = 1 / GAME_TICK_RATE;

type GameLoopOptions = {
  canvasSize: SharedValue<CanvasSize>;
  topPaddle: SharedValue<PaddleState>;
  bottomPaddle: SharedValue<PaddleState>;
  isAuthoritative?: boolean;
  onAuthoritativeSnapshot?: (snapshot: GameSnapshotMessage) => void;
};

type GameLoopSnapshot = {
  match: MatchState;
  countdown: number | null;
};

function areMatchSnapshotsEqual(left: MatchState, right: MatchState) {
  return (
    left.score.top === right.score.top &&
    left.score.bottom === right.score.bottom &&
    left.winningScore === right.winningScore &&
    left.rallyStartedAtTick === right.rallyStartedAtTick &&
    areMatchPhasesEqual(left.phase, right.phase)
  );
}

function areMatchPhasesEqual(left: MatchPhase, right: MatchPhase) {
  if (left.type !== right.type) {
    return false;
  }

  switch (left.type) {
    case 'playing':
      return true;
    case 'countdown':
      return (
        right.type === 'countdown' &&
        left.startedAtTick === right.startedAtTick &&
        left.endsAtTick === right.endsAtTick &&
        left.countFrom === right.countFrom &&
        left.stepDurationTicks === right.stepDurationTicks &&
        left.serveToward === right.serveToward
      );
    case 'point-scored':
      return (
        right.type === 'point-scored' &&
        left.scorer === right.scorer &&
        left.concededBy === right.concededBy &&
        left.endsAtTick === right.endsAtTick
      );
    case 'match-ended':
      return right.type === 'match-ended' && left.winner === right.winner;
  }
}

function queueReplicaSnapshot(
  target: SharedValue<GameSnapshotMessage | null>,
  match: SharedValue<MatchState>,
  countdown: SharedValue<number | null>,
  lastImpact: SharedValue<BallImpactEvent | null>,
  simulationTick: SharedValue<number>,
  snapshot: GameSnapshotMessage,
  nextCountdown: number | null,
) {
  'worklet';

  target.value = snapshot;
  match.value = snapshot.match;
  countdown.value = nextCountdown;
  lastImpact.value = snapshot.lastImpact;
  simulationTick.value = snapshot.tick;
}

export function useGameLoop({
  canvasSize,
  topPaddle,
  bottomPaddle,
  isAuthoritative = true,
  onAuthoritativeSnapshot,
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
  const replicaTarget = useSharedValue<GameSnapshotMessage | null>(null);

  const applyAuthoritativeSnapshot = useCallback(
    (authoritativeSnapshot: GameSnapshotMessage) => {
      const nextCountdown = getCountdownValue(
        authoritativeSnapshot.match,
        authoritativeSnapshot.tick,
      );

      setSnapshot((currentSnapshot) =>
        currentSnapshot.countdown === nextCountdown &&
        areMatchSnapshotsEqual(
          currentSnapshot.match,
          authoritativeSnapshot.match,
        )
          ? currentSnapshot
          : {
              match: authoritativeSnapshot.match,
              countdown: nextCountdown,
            },
      );
      scheduleOnUI(
        queueReplicaSnapshot,
        replicaTarget,
        match,
        countdown,
        lastImpact,
        simulationTick,
        authoritativeSnapshot,
        nextCountdown,
      );
    },
    [countdown, lastImpact, match, replicaTarget, simulationTick],
  );

  const restartMatch = useCallback(() => {
    if (!isAuthoritative) {
      return;
    }

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
    isAuthoritative,
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

    if (!isAuthoritative) {
      const target = replicaTarget.value;

      if (!target) {
        return;
      }

      ball.value =
        target.match.phase.type === 'playing'
          ? interpolateReplicaBall(ball.value, target.ball, frameTimeSeconds)
          : target.ball;
      topPaddle.value = applyReplicaPaddle(
        topPaddle.value,
        target.paddles.top,
        frameTimeSeconds,
      );
      bottomPaddle.value = {
        ...bottomPaddle.value,
        width: target.paddles.bottom.width,
      };
      return;
    }

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

      if (
        onAuthoritativeSnapshot &&
        nextTick % GAME_SNAPSHOT_SEND_INTERVAL_TICKS === 0
      ) {
        scheduleOnRN(
          onAuthoritativeSnapshot,
          createGameSnapshotMessage(
            nextTick,
            nextBall,
            nextTopPaddle,
            nextBottomPaddle,
            nextMatch,
            lastImpact.value,
          ),
        );
      }
    }
  });

  return {
    applyAuthoritativeSnapshot,
    ball,
    countdown: snapshot.countdown,
    lastImpact,
    match: snapshot.match,
    restartMatch,
    simulationTick,
  };
}
