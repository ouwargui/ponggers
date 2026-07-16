import { useCallback, useState } from 'react';
import {
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  type AiControllerState,
  createAiControllerState,
  stepAiController,
} from '@/game/ai/ai-controller';
import {
  type AiDifficulty,
  DEFAULT_AI_DIFFICULTY,
} from '@/game/ai/ai-difficulty';
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
  PlayerId,
} from '@/game/engine/types';
import type { CanvasSize } from '@/game/rendering/types';
import type { OnlineSessionRole } from '@/game/session/definition';
import {
  advanceRallyAuthority,
  createInitialRallyAuthority,
  type RallyAuthorityState,
  type RallyEventMessage,
  transformRallyEventForPeer,
} from '@/game/session/rally';
import {
  type MatchStateMessage,
  transformMatchStateForPeer,
} from '@/game/session/recovery';

const FIXED_STEP_SECONDS = 1 / GAME_TICK_RATE;

type GameLoopOptions = {
  aiDifficulty?: AiDifficulty;
  aiPlayerId?: PlayerId | null;
  canvasSize: SharedValue<CanvasSize>;
  topPaddle: SharedValue<PaddleState>;
  bottomPaddle: SharedValue<PaddleState>;
  onlineRole?: OnlineSessionRole | null;
  onRallyEvent?: (event: RallyEventMessage) => void;
  paused?: SharedValue<boolean>;
};

type GameLoopSnapshot = {
  match: MatchState;
  countdown: number | null;
};

function applyRemoteRallyEventOnUI(
  authority: SharedValue<RallyAuthorityState>,
  ball: SharedValue<BallState>,
  match: SharedValue<MatchState>,
  countdown: SharedValue<number | null>,
  lastImpact: SharedValue<BallImpactEvent | null>,
  simulationTick: SharedValue<number>,
  event: RallyEventMessage,
  updateSnapshot: (nextMatch: MatchState, countdown: number | null) => void,
) {
  'worklet';

  const nextAuthority = advanceRallyAuthority(authority.value, event);

  if (!nextAuthority) {
    return;
  }

  authority.value = nextAuthority;
  let nextMatch = match.value;

  if (event.type === 'rally-started') {
    ball.value = event.ball;
    lastImpact.value = null;
    nextMatch = {
      ...nextMatch,
      phase: { type: 'playing' },
      rallyStartedAtTick: simulationTick.value,
    };
  } else if (event.type === 'shot-returned') {
    ball.value = event.ball;
    lastImpact.value = event.impact;
  } else {
    nextMatch = recordGoal(nextMatch, {
      type: 'goal',
      ballId: ball.value.id,
      scorer: 'bottom',
      concededBy: 'top',
      boundary: 'top',
      tick: simulationTick.value,
    });
    ball.value = createWaitingBall();
    lastImpact.value = null;
  }

  const nextCountdown = getCountdownValue(nextMatch, simulationTick.value);
  match.value = nextMatch;
  countdown.value = nextCountdown;
  scheduleOnRN(updateSnapshot, nextMatch, nextCountdown);
}

function applyRemoteMatchStateOnUI(
  authority: SharedValue<RallyAuthorityState>,
  accumulatedTime: SharedValue<number>,
  ball: SharedValue<BallState>,
  topPaddle: SharedValue<PaddleState>,
  match: SharedValue<MatchState>,
  countdown: SharedValue<number | null>,
  lastImpact: SharedValue<BallImpactEvent | null>,
  simulationTick: SharedValue<number>,
  state: MatchStateMessage,
  updateSnapshot: (nextMatch: MatchState, countdown: number | null) => void,
) {
  'worklet';

  const nextCountdown = getCountdownValue(state.match, state.tick);

  accumulatedTime.value = 0;
  authority.value = state.authority;
  ball.value = state.ball;
  topPaddle.value = state.paddle;
  match.value = state.match;
  countdown.value = nextCountdown;
  lastImpact.value = state.lastImpact;
  simulationTick.value = state.tick;
  scheduleOnRN(updateSnapshot, state.match, nextCountdown);
}

export function useGameLoop({
  aiDifficulty = DEFAULT_AI_DIFFICULTY,
  aiPlayerId = null,
  canvasSize,
  topPaddle,
  bottomPaddle,
  onlineRole = null,
  onRallyEvent,
  paused,
}: GameLoopOptions) {
  const [snapshot, setSnapshot] = useState<GameLoopSnapshot>(() => {
    const match = createInitialMatchState(
      0,
      onlineRole === 'guest' ? 'top' : 'bottom',
    );
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
  const aiControllerState = useSharedValue<AiControllerState>(
    createAiControllerState(),
  );
  const rallyAuthority = useSharedValue<RallyAuthorityState>(
    createInitialRallyAuthority(),
  );

  const applyRallyEvent = useCallback(
    (event: RallyEventMessage) => {
      if (!onlineRole || event.playerRole === onlineRole) {
        return;
      }

      scheduleOnUI(
        applyRemoteRallyEventOnUI,
        rallyAuthority,
        ball,
        match,
        countdown,
        lastImpact,
        simulationTick,
        transformRallyEventForPeer(event),
        updateSnapshot,
      );
    },
    [
      ball,
      countdown,
      lastImpact,
      match,
      onlineRole,
      rallyAuthority,
      simulationTick,
      updateSnapshot,
    ],
  );

  const createMatchState = useCallback(
    (requestId: number): MatchStateMessage | null => {
      if (!onlineRole) {
        return null;
      }

      return {
        type: 'match-state',
        requestId,
        playerRole: onlineRole,
        tick: simulationTick.value,
        authority: rallyAuthority.value,
        ball: ball.value,
        paddle: bottomPaddle.value,
        match: match.value,
        lastImpact: lastImpact.value,
      };
    },
    [
      ball,
      bottomPaddle,
      lastImpact,
      match,
      onlineRole,
      rallyAuthority,
      simulationTick,
    ],
  );

  const applyMatchState = useCallback(
    (state: MatchStateMessage) => {
      if (!onlineRole || state.playerRole === onlineRole) {
        return;
      }

      scheduleOnUI(
        applyRemoteMatchStateOnUI,
        rallyAuthority,
        accumulatedTime,
        ball,
        topPaddle,
        match,
        countdown,
        lastImpact,
        simulationTick,
        transformMatchStateForPeer(state),
        updateSnapshot,
      );
    },
    [
      accumulatedTime,
      ball,
      countdown,
      lastImpact,
      match,
      onlineRole,
      rallyAuthority,
      simulationTick,
      topPaddle,
      updateSnapshot,
    ],
  );

  const restartMatch = useCallback(() => {
    scheduleOnUI(() => {
      'worklet';

      const nextMatch = createInitialMatchState(
        simulationTick.value,
        onlineRole === 'guest' ? 'top' : 'bottom',
      );
      const nextCountdown = getCountdownValue(nextMatch, simulationTick.value);

      accumulatedTime.value = 0;
      aiControllerState.value = createAiControllerState();
      ball.value = createWaitingBall();
      countdown.value = nextCountdown;
      lastImpact.value = null;
      rallyAuthority.value = createInitialRallyAuthority();
      topPaddle.value = resetPaddleForMatch(topPaddle.value);
      bottomPaddle.value = resetPaddleForMatch(bottomPaddle.value);
      match.value = nextMatch;
      scheduleOnRN(updateSnapshot, nextMatch, nextCountdown);
    });
  }, [
    accumulatedTime,
    aiControllerState,
    ball,
    bottomPaddle,
    countdown,
    lastImpact,
    match,
    onlineRole,
    rallyAuthority,
    simulationTick,
    topPaddle,
    updateSnapshot,
  ]);

  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (timeSincePreviousFrame === null) {
      return;
    }

    if (paused?.value) {
      accumulatedTime.value = 0;
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
    const ballShape = {
      radiusX: BALL_RADIUS_RATIO,
      radiusY: (BALL_RADIUS_RATIO * width) / height,
    };

    accumulatedTime.value += frameTimeSeconds;

    let nextBall = ball.value;
    let nextAiControllerState = aiControllerState.value;
    let nextMatch = match.value;
    let nextTopPaddle = topPaddle.value;
    let nextBottomPaddle = bottomPaddle.value;
    let nextTick = simulationTick.value;
    let nextImpact: BallImpactEvent | null = null;
    let nextRallyAuthority = rallyAuthority.value;
    let nextRallyEvent: RallyEventMessage | null = null;
    let didResetBall = false;
    let didStep = false;
    while (accumulatedTime.value >= FIXED_STEP_SECONDS) {
      nextTick += 1;
      const previousPhase = nextMatch.phase;
      nextMatch = advanceMatchPhase(nextMatch, nextTick);

      if (
        previousPhase.type === 'countdown' &&
        nextMatch.phase.type === 'playing'
      ) {
        if (!onlineRole) {
          nextBall = createServe({ vertical: previousPhase.serveToward });
        } else if (
          nextRallyAuthority.status === 'waiting-for-serve' &&
          nextRallyAuthority.nextServerRole === onlineRole
        ) {
          const serve = createServe({ vertical: 'bottom' });
          const event: RallyEventMessage = {
            type: 'rally-started',
            rallyId: nextRallyAuthority.rallyId + 1,
            shot: 0,
            playerRole: onlineRole,
            ball: serve,
          };
          const advancedAuthority = advanceRallyAuthority(
            nextRallyAuthority,
            event,
          );

          if (advancedAuthority) {
            nextRallyAuthority = advancedAuthority;
            nextBall = serve;
            nextRallyEvent = event;
          }
        }
      }

      if (aiPlayerId) {
        const aiPaddle =
          aiPlayerId === 'top' ? nextTopPaddle : nextBottomPaddle;
        const aiStep = stepAiController({
          ball: nextBall,
          ballShape,
          deltaSeconds: FIXED_STEP_SECONDS,
          difficulty: aiDifficulty,
          paddle: aiPaddle,
          state: nextAiControllerState,
          tick: nextTick,
        });

        nextAiControllerState = aiStep.state;

        if (aiPlayerId === 'top') {
          nextTopPaddle = aiStep.paddle;
        } else {
          nextBottomPaddle = aiStep.paddle;
        }
      }

      if (
        nextMatch.phase.type === 'playing' &&
        (!onlineRole || nextRallyAuthority.status === 'playing')
      ) {
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

        if (
          stepResult.impact &&
          (!onlineRole ||
            stepResult.impact.surface === 'wall' ||
            stepResult.impact.playerId === 'bottom')
        ) {
          nextImpact = stepResult.impact;
        }

        if (stepResult.goal) {
          const isLocallyConcededOnlinePoint =
            onlineRole !== null &&
            stepResult.goal.concededBy === 'bottom' &&
            nextRallyAuthority.defenderRole === onlineRole;

          if (!onlineRole || isLocallyConcededOnlinePoint) {
            if (isLocallyConcededOnlinePoint) {
              const event: RallyEventMessage = {
                type: 'point-conceded',
                rallyId: nextRallyAuthority.rallyId,
                shot: nextRallyAuthority.shot,
                playerRole: onlineRole,
              };
              const advancedAuthority = advanceRallyAuthority(
                nextRallyAuthority,
                event,
              );

              if (advancedAuthority) {
                nextRallyAuthority = advancedAuthority;
                nextRallyEvent = event;
              }
            }

            nextMatch = recordGoal(nextMatch, stepResult.goal);
            nextBall = createWaitingBall();
            didResetBall = true;
          } else {
            nextBall = {
              ...stepResult.ball,
              velocity: { x: 0, y: 0 },
            };
          }
        } else if (
          onlineRole &&
          stepResult.impact?.surface === 'paddle' &&
          stepResult.impact.playerId === 'bottom' &&
          nextRallyAuthority.defenderRole === onlineRole
        ) {
          const event: RallyEventMessage = {
            type: 'shot-returned',
            rallyId: nextRallyAuthority.rallyId,
            shot: nextRallyAuthority.shot + 1,
            playerRole: onlineRole,
            ball: stepResult.ball,
            impact: stepResult.impact,
          };
          const advancedAuthority = advanceRallyAuthority(
            nextRallyAuthority,
            event,
          );

          if (advancedAuthority) {
            nextRallyAuthority = advancedAuthority;
            nextRallyEvent = event;
          }
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

      if (nextAiControllerState !== aiControllerState.value) {
        aiControllerState.value = nextAiControllerState;
      }

      if (nextRallyAuthority !== rallyAuthority.value) {
        rallyAuthority.value = nextRallyAuthority;
      }

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

      if (
        nextTopPaddle.centerX !== topPaddle.value.centerX ||
        nextTopPaddle.velocityX !== topPaddle.value.velocityX
      ) {
        topPaddle.value = nextTopPaddle;
      }

      if (
        nextBottomPaddle.centerX !== bottomPaddle.value.centerX ||
        nextBottomPaddle.velocityX !== bottomPaddle.value.velocityX
      ) {
        bottomPaddle.value = nextBottomPaddle;
      }

      if (onRallyEvent && nextRallyEvent) {
        scheduleOnRN(onRallyEvent, nextRallyEvent);
      }
    }
  });

  return {
    applyMatchState,
    applyRallyEvent,
    ball,
    countdown: snapshot.countdown,
    createMatchState,
    lastImpact,
    match: snapshot.match,
    restartMatch,
    simulationTick,
  };
}
