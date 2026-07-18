import { type PanGesture, usePanGesture } from 'react-native-gesture-handler';
import {
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PADDLE_INPUT_SEND_INTERVAL_TICKS } from '@/game/constants';
import {
  applyPaddleInput,
  createPaddle,
  layoutPaddle,
} from '@/game/engine/paddle';
import type { PaddleInput, PaddleState, PlayerId } from '@/game/engine/types';
import type { CanvasSize } from '@/game/rendering/types';
import { createPaddleInput, shouldSendPaddleInput } from '@/game/session/input';

export type PaddleRuntimeState = SharedValue<PaddleState>;

type PaddleControlOptions = {
  enabled?: boolean;
  interactionActive?: SharedValue<boolean>;
  interactionSequence?: SharedValue<number>;
  onInput?: (input: PaddleInput) => void;
  simultaneousWith?: PanGesture;
  simulationTick: SharedValue<number>;
};

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
  {
    enabled = true,
    interactionActive,
    interactionSequence,
    onInput,
    simultaneousWith,
    simulationTick,
  }: PaddleControlOptions,
): PanGesture {
  const inputSequence = useSharedValue(0);
  const lastSentTick = useSharedValue(-PADDLE_INPUT_SEND_INTERVAL_TICKS);
  const previousTouchX = useSharedValue(0);

  return usePanGesture({
    enabled,
    minDistance: 0,
    shouldCancelWhenOutside: false,
    simultaneousWith,
    onBegin: (event) => {
      'worklet';

      previousTouchX.value = event.absoluteX;

      if (interactionActive) {
        interactionActive.value = true;
      }
    },
    onUpdate: (event) => {
      'worklet';

      const width = canvasSize.value.width;
      const changeX = event.absoluteX - previousTouchX.value;

      previousTouchX.value = event.absoluteX;

      if (width <= 0 || !Number.isFinite(changeX)) {
        return;
      }

      const currentPaddle = paddle.value;
      const nextX = currentPaddle.centerX + changeX / width;
      const nextSequence = inputSequence.value + 1;
      const input = createPaddleInput({
        playerId: currentPaddle.id,
        sequence: nextSequence,
        centerX: nextX,
        velocityX: event.velocityX / width,
        clientTick: simulationTick.value,
      });

      inputSequence.value = nextSequence;
      paddle.value = applyPaddleInput(currentPaddle, input);

      if (interactionSequence) {
        interactionSequence.value += 1;
      }

      if (
        onInput &&
        shouldSendPaddleInput(input.clientTick, lastSentTick.value)
      ) {
        lastSentTick.value = input.clientTick;
        scheduleOnRN(onInput, input);
      }
    },
    onFinalize: () => {
      'worklet';

      previousTouchX.value = 0;

      if (interactionActive) {
        interactionActive.value = false;
      }
    },
  });
}
