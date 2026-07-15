import type { SharedValue } from 'react-native-reanimated';
import type { EdgeInsets } from 'react-native-safe-area-context';

import {
  type PaddleRuntimeState,
  usePaddleState,
} from '@/game/input/use-paddle-control';
import type { CanvasSize } from '@/game/rendering/types';

export type SessionPaddles = {
  top: PaddleRuntimeState;
  bottom: PaddleRuntimeState;
};

export function useSessionPaddles(
  canvasSize: SharedValue<CanvasSize>,
  insets: EdgeInsets,
): SessionPaddles {
  const top = usePaddleState('top', canvasSize, insets.top);
  const bottom = usePaddleState('bottom', canvasSize, insets.bottom);

  return { top, bottom };
}
