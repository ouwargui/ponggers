import { type PanGesture, usePanGesture } from 'react-native-gesture-handler';
import {
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';

import { createPaddle, layoutPaddle } from '@/game/engine/paddle';
import type { PaddleState, PlayerId } from '@/game/engine/types';
import type { CanvasSize } from '@/game/rendering/types';

export type PaddleRuntimeState = SharedValue<PaddleState>;

export function usePaddleState(
  id: PlayerId,
  canvasSize: SharedValue<CanvasSize>,
  edgeInset: number,
): PaddleRuntimeState {
  const paddle = useSharedValue(createPaddle(id));

  useAnimatedReaction(
    () => ({ ...canvasSize.value, edgeInset }),
    ({ width, height, edgeInset: currentEdgeInset }, previous) => {
      if (
        previous &&
        previous.width === width &&
        previous.height === height &&
        previous.edgeInset === currentEdgeInset
      ) {
        return;
      }

      paddle.value = layoutPaddle(
        paddle.value,
        width,
        height,
        currentEdgeInset,
      );
    },
  );

  return paddle;
}

export function usePaddleControl(
  canvasSize: SharedValue<CanvasSize>,
  paddle: PaddleRuntimeState,
  simultaneousWith?: PanGesture,
): PanGesture {
  return usePanGesture({
    minDistance: 0,
    shouldCancelWhenOutside: false,
    simultaneousWith,
    onUpdate: (event) => {
      'worklet';

      const width = canvasSize.value.width;

      if (width <= 0) {
        return;
      }

      const currentPaddle = paddle.value;
      const halfPaddleWidth = currentPaddle.width / 2;
      const nextX = currentPaddle.centerX + event.changeX / width;

      paddle.value = {
        ...currentPaddle,
        centerX: Math.max(
          halfPaddleWidth,
          Math.min(nextX, 1 - halfPaddleWidth),
        ),
        velocityX: event.velocityX / width,
      };
    },
  });
}
