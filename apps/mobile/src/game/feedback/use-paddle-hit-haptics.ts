import * as Haptics from 'expo-haptics';
import { type SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { BallImpactEvent } from '@/game/engine/types';
import {
  getPaddleHapticPlayers,
  getPaddleHitHapticStrength,
  type PaddleHitHapticStrength,
  shouldPlayPaddleHitHaptic,
} from '@/game/feedback/paddle-hit-haptic-policy';

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
  enabled = true,
) {
  const hapticPlayers = getPaddleHapticPlayers(enabled);

  useAnimatedReaction(
    () => lastImpact.value,
    (impact, previousImpact) => {
      if (!shouldPlayPaddleHitHaptic(impact, previousImpact, hapticPlayers)) {
        return;
      }

      scheduleOnRN(
        playPaddleHitHaptic,
        getPaddleHitHapticStrength(impact.intensity),
      );
    },
  );
}
