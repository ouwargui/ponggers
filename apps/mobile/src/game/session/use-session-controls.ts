import type { PanGesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';

import type { PaddleInput } from '@/game/engine/types';
import { usePaddleControl } from '@/game/input/use-paddle-control';
import type { CanvasSize } from '@/game/rendering/types';
import {
  type GameSessionDefinition,
  isPlayerLocallyControlled,
} from '@/game/session/definition';
import type { PaddleInteractionState } from '@/game/session/use-session-paddle-presentations';
import type { SessionPaddles } from '@/game/session/use-session-paddles';

export type SessionControls = {
  top: PanGesture;
  bottom: PanGesture;
};

type UseSessionControlsOptions = {
  session: GameSessionDefinition;
  canvasSize: SharedValue<CanvasSize>;
  paddles: SessionPaddles;
  simulationTick: SharedValue<number>;
  enabled: boolean;
  interactionActive?: PaddleInteractionState;
  onLocalInput?: (input: PaddleInput) => void;
};

export function useSessionControls({
  session,
  canvasSize,
  paddles,
  simulationTick,
  enabled,
  interactionActive,
  onLocalInput,
}: UseSessionControlsOptions): SessionControls {
  const top = usePaddleControl(canvasSize, paddles.top, {
    enabled: enabled && isPlayerLocallyControlled(session, 'top'),
    interactionActive: interactionActive?.top.active,
    interactionSequence: interactionActive?.top.updateSequence,
    onInput: onLocalInput,
    simulationTick,
  });
  const bottom = usePaddleControl(canvasSize, paddles.bottom, {
    enabled: enabled && isPlayerLocallyControlled(session, 'bottom'),
    interactionActive: interactionActive?.bottom.active,
    interactionSequence: interactionActive?.bottom.updateSequence,
    onInput: onLocalInput,
    simultaneousWith: top,
    simulationTick,
  });

  return { top, bottom };
}
