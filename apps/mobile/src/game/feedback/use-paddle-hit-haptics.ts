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
import type { EffectLevel } from '@/settings/game-preferences';

function playPaddleHitHaptic(
  strength: PaddleHitHapticStrength,
  level: EffectLevel,
) {
  if (level === 'off') {
    return;
  }

  const effectiveStrength =
    level === 'subtle' ? (strength === 'heavy' ? 'medium' : 'light') : strength;
  const style =
    effectiveStrength === 'heavy'
      ? Haptics.ImpactFeedbackStyle.Heavy
      : effectiveStrength === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;

  void Haptics.impactAsync(style);
}

export function usePaddleHitHaptics(
  lastImpact: SharedValue<BallImpactEvent | null>,
  level: EffectLevel = 'full',
) {
  const hapticPlayers = getPaddleHapticPlayers(level !== 'off');

  useAnimatedReaction(
    () => lastImpact.value,
    (impact, previousImpact) => {
      if (!shouldPlayPaddleHitHaptic(impact, previousImpact, hapticPlayers)) {
        return;
      }

      scheduleOnRN(
        playPaddleHitHaptic,
        getPaddleHitHapticStrength(impact.intensity),
        level,
      );
    },
    [level],
  );
}
