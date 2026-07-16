import { rect, rrect } from '@shopify/react-native-skia';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';

import { BALL_RADIUS_RATIO } from '@/game/constants';
import { PRIMARY_BALL_ID } from '@/game/engine/serve';
import type { BallState, PaddleState } from '@/game/engine/types';
import type { BallPresentationState } from '@/game/presentation/use-ball-presentation';
import type { PaddlePresentationState } from '@/game/presentation/use-paddle-presentation';
import type { CanvasSize, GameGeometry } from '@/game/rendering/types';
import { useBallTrailGeometry } from '@/game/rendering/use-ball-trail-geometry';

type GameGeometryOptions = {
  canvasSize: SharedValue<CanvasSize>;
  topPaddle: SharedValue<PaddleState>;
  bottomPaddle: SharedValue<PaddleState>;
  ball: SharedValue<BallState>;
  ballPresentation: BallPresentationState;
  paddlePresentation: Record<'top' | 'bottom', PaddlePresentationState>;
};

function usePaddleRect(
  canvasSize: SharedValue<CanvasSize>,
  paddle: SharedValue<PaddleState>,
  presentation: PaddlePresentationState,
  glowOffsetMultiplier = 0,
) {
  return useDerivedValue(() => {
    const { width, height } = canvasSize.value;

    if (width <= 0 || height <= 0) {
      return rrect(rect(0, 0, 0, 0), 0, 0);
    }

    const currentPaddle = paddle.value;
    const paddleWidth =
      width *
      currentPaddle.width *
      presentation.motionScaleX.value *
      presentation.impactScaleX.value;
    const paddleHeight =
      height *
      currentPaddle.height *
      presentation.motionScaleY.value *
      presentation.impactScaleY.value;
    const centerX =
      currentPaddle.centerX * width +
      presentation.shakeX.value +
      presentation.glowOffsetX.value * glowOffsetMultiplier;
    const centerY = currentPaddle.centerY * height + presentation.shakeY.value;

    return rrect(
      rect(
        centerX - paddleWidth / 2,
        centerY - paddleHeight / 2,
        paddleWidth,
        paddleHeight,
      ),
      12,
      12,
    );
  });
}

export function useGameGeometry({
  canvasSize,
  topPaddle,
  bottomPaddle,
  ball,
  ballPresentation,
  paddlePresentation,
}: GameGeometryOptions): GameGeometry {
  const centerLine = useDerivedValue(() =>
    rect(0, canvasSize.value.height / 2 - 1, canvasSize.value.width, 2),
  );

  const topPaddleRect = usePaddleRect(
    canvasSize,
    topPaddle,
    paddlePresentation.top,
  );
  const topPaddleGlowRect = usePaddleRect(
    canvasSize,
    topPaddle,
    paddlePresentation.top,
    1,
  );
  const topPaddleNearTrailRect = usePaddleRect(
    canvasSize,
    topPaddle,
    paddlePresentation.top,
    2.4,
  );
  const topPaddleFarTrailRect = usePaddleRect(
    canvasSize,
    topPaddle,
    paddlePresentation.top,
    4,
  );
  const bottomPaddleRect = usePaddleRect(
    canvasSize,
    bottomPaddle,
    paddlePresentation.bottom,
  );
  const bottomPaddleGlowRect = usePaddleRect(
    canvasSize,
    bottomPaddle,
    paddlePresentation.bottom,
    1,
  );
  const bottomPaddleNearTrailRect = usePaddleRect(
    canvasSize,
    bottomPaddle,
    paddlePresentation.bottom,
    2.4,
  );
  const bottomPaddleFarTrailRect = usePaddleRect(
    canvasSize,
    bottomPaddle,
    paddlePresentation.bottom,
    4,
  );

  const ballCenterX = useDerivedValue(
    () => ball.value.position.x * canvasSize.value.width,
  );
  const ballCenterY = useDerivedValue(
    () => ball.value.position.y * canvasSize.value.height,
  );
  const ballRadius = useDerivedValue(
    () => canvasSize.value.width * BALL_RADIUS_RATIO,
  );
  const ballTrail = useBallTrailGeometry(canvasSize, ballPresentation.trail);

  return {
    centerLine,
    paddles: [
      {
        id: 'top',
        rect: topPaddleRect,
        glowRect: topPaddleGlowRect,
        glowPulse: paddlePresentation.top.glowPulse,
        trailOffsetX: paddlePresentation.top.glowOffsetX,
        trailRects: [topPaddleNearTrailRect, topPaddleFarTrailRect],
      },
      {
        id: 'bottom',
        rect: bottomPaddleRect,
        glowRect: bottomPaddleGlowRect,
        glowPulse: paddlePresentation.bottom.glowPulse,
        trailOffsetX: paddlePresentation.bottom.glowOffsetX,
        trailRects: [bottomPaddleNearTrailRect, bottomPaddleFarTrailRect],
      },
    ],
    balls: [
      {
        id: PRIMARY_BALL_ID,
        centerX: ballCenterX,
        centerY: ballCenterY,
        radius: ballRadius,
        scaleX: ballPresentation.scaleX,
        scaleY: ballPresentation.scaleY,
        lastHitBy: ballPresentation.lastHitBy,
        trail: ballTrail,
      },
    ],
  };
}
