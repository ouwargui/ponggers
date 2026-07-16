import { describe, expect, test } from 'bun:test';

import {
  createAiControllerState,
  predictBallInterceptX,
  stepAiController,
} from '@/game/ai/ai-controller';
import { AI_DIFFICULTIES, type AiDifficulty } from '@/game/ai/ai-difficulty';
import type { BallCollisionShape } from '@/game/engine/collisions';
import { stepBall } from '@/game/engine/simulation';
import type { BallState, PaddleState } from '@/game/engine/types';

const BALL_SHAPE: BallCollisionShape = {
  radiusX: 0.035,
  radiusY: 0.02,
};

const TOP_PADDLE: PaddleState = {
  id: 'top',
  centerX: 0.5,
  centerY: 0.08,
  width: 0.32,
  height: 0.02,
  velocityX: 0,
};

const PERFECT_DIFFICULTY: AiDifficulty = {
  reactionMs: 100,
  maxSpeed: 1,
  predictionError: 0,
  returnToCenterSpeed: 0.4,
};

function createBall(
  position: BallState['position'],
  velocity: BallState['velocity'],
): BallState {
  return { id: 'test-ball', position, velocity };
}

function returnsIncomingShot(
  difficulty: AiDifficulty,
  ball: BallState,
  startTick: number,
) {
  let currentBall = ball;
  let paddle = TOP_PADDLE;
  let state = createAiControllerState();

  for (let offset = 0; offset < 300; offset += 1) {
    const tick = startTick + offset;
    const aiStep = stepAiController({
      ball: currentBall,
      ballShape: BALL_SHAPE,
      deltaSeconds: 1 / 120,
      difficulty,
      paddle,
      state,
      tick,
    });
    const ballStep = stepBall(
      currentBall,
      { ballShape: BALL_SHAPE, paddles: [aiStep.paddle] },
      1 / 120,
      tick,
    );

    currentBall = ballStep.ball;
    paddle = aiStep.paddle;
    state = aiStep.state;

    if (ballStep.impact?.playerId === 'top') {
      return true;
    }

    if (ballStep.goal) {
      return false;
    }
  }

  return false;
}

describe('AI paddle controller', () => {
  test('predicts a straight intercept at the paddle face', () => {
    const intercept = predictBallInterceptX(
      createBall({ x: 0.2, y: 0.5 }, { x: 0.1, y: -0.4 }),
      TOP_PADDLE,
      BALL_SHAPE,
    );

    expect(intercept).toBeCloseTo(0.2975, 4);
  });

  test('includes side-wall reflections in the intercept', () => {
    const intercept = predictBallInterceptX(
      createBall({ x: 0.8, y: 0.5 }, { x: 0.4, y: -0.39 }),
      TOP_PADDLE,
      BALL_SHAPE,
    );

    expect(intercept).toBeCloseTo(0.73, 4);
  });

  test('does not predict a ball moving away from the paddle', () => {
    const intercept = predictBallInterceptX(
      createBall({ x: 0.2, y: 0.5 }, { x: 0.1, y: 0.4 }),
      TOP_PADDLE,
      BALL_SHAPE,
    );

    expect(intercept).toBeNull();
  });

  test('waits for its reaction window before pursuing an intercept', () => {
    const ball = createBall({ x: 0.8, y: 0.5 }, { x: 0, y: -0.4 });
    const initial = stepAiController({
      ball,
      ballShape: BALL_SHAPE,
      deltaSeconds: 1 / 120,
      difficulty: PERFECT_DIFFICULTY,
      paddle: TOP_PADDLE,
      state: createAiControllerState(),
      tick: 10,
    });
    const reacted = stepAiController({
      ball,
      ballShape: BALL_SHAPE,
      deltaSeconds: 1 / 120,
      difficulty: PERFECT_DIFFICULTY,
      paddle: initial.paddle,
      state: initial.state,
      tick: initial.state.nextDecisionTick,
    });

    expect(initial.paddle.centerX).toBe(0.5);
    expect(reacted.paddle.centerX).toBeGreaterThan(0.5);
    expect(reacted.paddle.velocityX).toBeCloseTo(1, 5);
  });

  test('returns toward center at a limited speed while the ball moves away', () => {
    const paddle = { ...TOP_PADDLE, centerX: 0.8 };
    const result = stepAiController({
      ball: createBall({ x: 0.2, y: 0.5 }, { x: 0, y: 0.4 }),
      ballShape: BALL_SHAPE,
      deltaSeconds: 0.1,
      difficulty: PERFECT_DIFFICULTY,
      paddle,
      state: createAiControllerState(),
      tick: 20,
    });

    expect(result.paddle.centerX).toBeCloseTo(0.76, 5);
    expect(result.paddle.velocityX).toBeCloseTo(-0.4, 5);
  });

  test('drives the regular collision simulation to return an incoming shot', () => {
    let ball = createBall({ x: 0.2, y: 0.6 }, { x: 0.2, y: -0.5 });
    let paddle = TOP_PADDLE;
    let state = createAiControllerState();
    let returned = false;

    for (let tick = 1; tick <= 240; tick += 1) {
      const aiStep = stepAiController({
        ball,
        ballShape: BALL_SHAPE,
        deltaSeconds: 1 / 120,
        difficulty: AI_DIFFICULTIES.hard,
        paddle,
        state,
        tick,
      });
      const ballStep = stepBall(
        ball,
        { ballShape: BALL_SHAPE, paddles: [aiStep.paddle] },
        1 / 120,
        tick,
      );

      paddle = aiStep.paddle;
      state = aiStep.state;
      ball = ballStep.ball;

      if (ballStep.impact?.playerId === 'top') {
        returned = true;
        break;
      }

      if (ballStep.goal) {
        break;
      }
    }

    expect(returned).toBe(true);
    expect(ball.velocity.y).toBeGreaterThan(0);
  });

  test('makes the calibrated levels progressively harder to score against', () => {
    const returnedShots = {
      easy: 0,
      medium: 0,
      hard: 0,
    };
    let totalShots = 0;

    for (const x of [0.2, 0.5, 0.8]) {
      for (const velocityX of [-0.4, 0.2, 0.5]) {
        for (let startTick = 1; startTick <= 283; startTick += 47) {
          totalShots += 1;

          for (const level of ['easy', 'medium', 'hard'] as const) {
            const didReturn = returnsIncomingShot(
              AI_DIFFICULTIES[level],
              createBall({ x, y: 0.6 }, { x: velocityX, y: -0.5 }),
              startTick,
            );

            if (didReturn) {
              returnedShots[level] += 1;
            }
          }
        }
      }
    }

    expect(returnedShots.easy).toBeLessThan(returnedShots.medium);
    expect(returnedShots.medium).toBeLessThan(returnedShots.hard);
    expect(returnedShots.easy).toBeLessThan(totalShots);
    expect(returnedShots.hard).toBe(totalShots);
  });
});
