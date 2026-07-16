import { type SharedValue, useSharedValue } from 'react-native-reanimated';

import type { BallImpactEvent, PlayerId } from '@/game/engine/types';
import {
  type PaddlePresentationState,
  usePaddlePresentation,
} from '@/game/presentation/use-paddle-presentation';
import {
  type GameSessionDefinition,
  isPlayerLocallyControlled,
} from '@/game/session/definition';
import type { SessionPaddles } from '@/game/session/use-session-paddles';

export type PaddleInteractionState = Record<
  PlayerId,
  {
    active: SharedValue<boolean>;
    updateSequence: SharedValue<number>;
  }
>;
export type PaddlePresentations = Record<PlayerId, PaddlePresentationState>;

export function useSessionPaddlePresentations(
  session: GameSessionDefinition,
  paddles: SessionPaddles,
  lastImpact: SharedValue<BallImpactEvent | null>,
): {
  interactionActive: PaddleInteractionState;
  players: PaddlePresentations;
} {
  const topInteractionActive = useSharedValue(false);
  const bottomInteractionActive = useSharedValue(false);
  const topInteractionSequence = useSharedValue(0);
  const bottomInteractionSequence = useSharedValue(0);
  const top = usePaddlePresentation(paddles.top, lastImpact, {
    interactionActive: topInteractionActive,
    interactionSequence: topInteractionSequence,
    locallyControlled: isPlayerLocallyControlled(session, 'top'),
  });
  const bottom = usePaddlePresentation(paddles.bottom, lastImpact, {
    interactionActive: bottomInteractionActive,
    interactionSequence: bottomInteractionSequence,
    locallyControlled: isPlayerLocallyControlled(session, 'bottom'),
  });

  return {
    interactionActive: {
      top: {
        active: topInteractionActive,
        updateSequence: topInteractionSequence,
      },
      bottom: {
        active: bottomInteractionActive,
        updateSequence: bottomInteractionSequence,
      },
    },
    players: { top, bottom },
  };
}
