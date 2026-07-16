import type { AiDifficulty } from '@/game/ai/ai-difficulty';
import { GAME_TICK_RATE } from '@/game/constants';
import type { BallCollisionShape } from '@/game/engine/collisions';
import { applyPaddleInput } from '@/game/engine/paddle';
import type { BallState, PaddleState } from '@/game/engine/types';

export type AiControllerState = {
  aimOffset: number;
  nextDecisionTick: number;
  shotSequence: number;
  targetX: number;
  wasApproaching: boolean;
};

const AI_TARGET_DEAD_ZONE = 0.002;

export function createAiControllerState(): AiControllerState {
  'worklet';

  return {
    aimOffset: 0,
    nextDecisionTick: 0,
    shotSequence: 0,
    targetX: 0.5,
    wasApproaching: false,
  };
}

function reflectIntoBounds(position: number, minimum: number, maximum: number) {
  'worklet';

  const span = maximum - minimum;

  if (span <= 0) {
    return minimum;
  }

  const period = span * 2;
  const wrapped = (((position - minimum) % period) + period) % period;

  return wrapped <= span ? minimum + wrapped : maximum - (wrapped - span);
}

function isBallApproachingPaddle(ball: BallState, paddle: PaddleState) {
  'worklet';

  return paddle.id === 'top' ? ball.velocity.y < 0 : ball.velocity.y > 0;
}

export function predictBallInterceptX(
  ball: BallState,
  paddle: PaddleState,
  ballShape: BallCollisionShape,
): number | null {
  'worklet';

  if (!isBallApproachingPaddle(ball, paddle) || ball.velocity.y === 0) {
    return null;
  }

  const paddleFaceY =
    paddle.id === 'top'
      ? paddle.centerY + paddle.height / 2 + ballShape.radiusY
      : paddle.centerY - paddle.height / 2 - ballShape.radiusY;
  const timeToPaddle = (paddleFaceY - ball.position.y) / ball.velocity.y;

  if (timeToPaddle <= 0) {
    return null;
  }

  const projectedX = ball.position.x + ball.velocity.x * timeToPaddle;

  return reflectIntoBounds(
    projectedX,
    ballShape.radiusX,
    1 - ballShape.radiusX,
  );
}

function deterministicSignedNoise(seed: number) {
  'worklet';

  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  const unitValue = value - Math.floor(value);

  return unitValue * 2 - 1;
}

type StepAiControllerOptions = {
  ball: BallState;
  ballShape: BallCollisionShape;
  deltaSeconds: number;
  difficulty: AiDifficulty;
  paddle: PaddleState;
  state: AiControllerState;
  tick: number;
};

export function stepAiController({
  ball,
  ballShape,
  deltaSeconds,
  difficulty,
  paddle,
  state,
  tick,
}: StepAiControllerOptions): {
  paddle: PaddleState;
  state: AiControllerState;
} {
  'worklet';

  const approaching = isBallApproachingPaddle(ball, paddle);
  const reactionTicks = Math.max(
    1,
    Math.round((difficulty.reactionMs / 1_000) * GAME_TICK_RATE),
  );
  let aimOffset = state.aimOffset;
  let nextDecisionTick = state.nextDecisionTick;
  let shotSequence = state.shotSequence;
  let targetX = state.targetX;

  if (approaching && !state.wasApproaching) {
    shotSequence += 1;
    aimOffset =
      deterministicSignedNoise(tick + shotSequence * 7_919) *
      difficulty.predictionError;
    nextDecisionTick = tick + reactionTicks;
  }

  if (!approaching) {
    targetX = 0.5;
    nextDecisionTick = tick + reactionTicks;
  } else if (tick >= nextDecisionTick) {
    const interceptX = predictBallInterceptX(ball, paddle, ballShape);

    if (interceptX !== null) {
      targetX = interceptX + aimOffset;
    }

    nextDecisionTick = tick + reactionTicks;
  }

  const deltaX = targetX - paddle.centerX;
  const speed = approaching
    ? difficulty.maxSpeed
    : difficulty.returnToCenterSpeed;
  const maximumMovement = Math.max(speed * deltaSeconds, 0);
  const movement =
    Math.abs(deltaX) <= AI_TARGET_DEAD_ZONE
      ? 0
      : Math.max(-maximumMovement, Math.min(deltaX, maximumMovement));
  const velocityX = deltaSeconds > 0 ? movement / deltaSeconds : 0;
  const nextPaddle = applyPaddleInput(paddle, {
    type: 'paddle-input',
    playerId: paddle.id,
    sequence: tick,
    centerX: paddle.centerX + movement,
    velocityX,
    clientTick: tick,
  });

  return {
    paddle: nextPaddle,
    state: {
      aimOffset,
      nextDecisionTick,
      shotSequence,
      targetX,
      wasApproaching: approaching,
    },
  };
}
