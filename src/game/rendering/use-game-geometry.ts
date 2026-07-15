import { rect, rrect, usePathValue, vec } from '@shopify/react-native-skia';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';

import { BALL_RADIUS_RATIO } from '@/game/constants';
import { PRIMARY_BALL_ID } from '@/game/engine/serve';
import type { BallState, PaddleState } from '@/game/engine/types';
import type { BallPresentationState } from '@/game/presentation/use-ball-presentation';
import type { CanvasSize, GameGeometry } from '@/game/rendering/types';

type GameGeometryOptions = {
  canvasSize: SharedValue<CanvasSize>;
  topPaddle: SharedValue<PaddleState>;
  bottomPaddle: SharedValue<PaddleState>;
  ball: SharedValue<BallState>;
  ballPresentation: BallPresentationState;
};

function usePaddleRect(
  canvasSize: SharedValue<CanvasSize>,
  paddle: SharedValue<PaddleState>,
) {
  return useDerivedValue(() => {
    const { width, height } = canvasSize.value;

    if (width <= 0 || height <= 0) {
      return rrect(rect(0, 0, 0, 0), 0, 0);
    }

    const currentPaddle = paddle.value;
    const paddleWidth = width * currentPaddle.width;
    const paddleHeight = height * currentPaddle.height;

    return rrect(
      rect(
        currentPaddle.centerX * width - paddleWidth / 2,
        currentPaddle.centerY * height - paddleHeight / 2,
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
}: GameGeometryOptions): GameGeometry {
  const centerLine = useDerivedValue(() =>
    rect(0, canvasSize.value.height / 2 - 1, canvasSize.value.width, 2),
  );

  const topPaddleRect = usePaddleRect(canvasSize, topPaddle);
  const bottomPaddleRect = usePaddleRect(canvasSize, bottomPaddle);

  const ballCenterX = useDerivedValue(
    () => ball.value.position.x * canvasSize.value.width,
  );
  const ballCenterY = useDerivedValue(
    () => ball.value.position.y * canvasSize.value.height,
  );
  const ballRadius = useDerivedValue(
    () => canvasSize.value.width * BALL_RADIUS_RATIO,
  );
  const ballTrailPath = usePathValue((path) => {
    'worklet';

    const points = ballPresentation.trail.value;

    if (points.length < 2) {
      return;
    }

    const { width, height } = canvasSize.value;
    const oldestPoint = points[points.length - 1];
    path.moveTo(oldestPoint.x * width, oldestPoint.y * height);

    for (let index = points.length - 2; index >= 0; index -= 1) {
      const point = points[index];
      path.lineTo(point.x * width, point.y * height);
    }
  });
  const ballTrailStart = useDerivedValue(() => {
    const points = ballPresentation.trail.value;
    const point = points[points.length - 1] ?? ball.value.position;

    return vec(
      point.x * canvasSize.value.width,
      point.y * canvasSize.value.height,
    );
  });
  const ballTrailEnd = useDerivedValue(() => {
    const point = ballPresentation.trail.value[0] ?? ball.value.position;

    return vec(
      point.x * canvasSize.value.width,
      point.y * canvasSize.value.height,
    );
  });

  return {
    centerLine,
    paddles: [
      { id: 'top', rect: topPaddleRect },
      { id: 'bottom', rect: bottomPaddleRect },
    ],
    balls: [
      {
        id: PRIMARY_BALL_ID,
        centerX: ballCenterX,
        centerY: ballCenterY,
        radius: ballRadius,
        scaleX: ballPresentation.scaleX,
        scaleY: ballPresentation.scaleY,
        trail: {
          path: ballTrailPath,
          start: ballTrailStart,
          end: ballTrailEnd,
        },
      },
    ],
  };
}
