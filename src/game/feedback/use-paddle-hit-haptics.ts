import * as Haptics from 'expo-haptics';
import { type SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { BallImpactEvent } from '@/game/engine/types';
import {
  getPaddleHitHapticStrength,
  type PaddleHitHapticStrength,
  shouldPlayPaddleHitHaptic,
} from '@/game/feedback/paddle-hit-haptic-policy';
import type { GameSessionDefinition } from '@/game/session/definition';

function playPaddleHitHaptic(strength: PaddleHitHapticStrength) {
  const style =
    strength === 'heavy'
      ? Haptics.ImpactFeedbackStyle.Heavy
      : strength === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;

  void Haptics.impactAsync(style);
}

export function usePaddleHitHaptics(
  lastImpact: SharedValue<BallImpactEvent | null>,
  session: GameSessionDefinition,
  enabled = true,
) {
  const locallyControlledPlayers = {
    top: enabled && session.inputSources.top === 'local',
    bottom: enabled && session.inputSources.bottom === 'local',
  };

  useAnimatedReaction(
    () => lastImpact.value,
    (impact, previousImpact) => {
      if (
        !shouldPlayPaddleHitHaptic(
          impact,
          previousImpact,
          locallyControlledPlayers,
        )
      ) {
        return;
      }

      scheduleOnRN(
        playPaddleHitHaptic,
        getPaddleHitHapticStrength(impact.intensity),
      );
    },
  );
}
