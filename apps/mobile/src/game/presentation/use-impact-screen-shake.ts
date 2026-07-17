import {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { BallImpactEvent } from '@/game/engine/types';

export function useImpactScreenShake(
  lastImpact: SharedValue<BallImpactEvent | null>,
  strength: number,
) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  useAnimatedReaction(
    () => lastImpact.value,
    (impact, previousImpact) => {
      if (
        !impact ||
        strength <= 0 ||
        (previousImpact &&
          impact.tick === previousImpact.tick &&
          impact.ballId === previousImpact.ballId)
      ) {
        return;
      }

      const surfaceStrength = impact.surface === 'paddle' ? 1 : 0.45;
      const magnitude =
        strength * surfaceStrength * (1.5 + impact.intensity * 3);
      const horizontalDirection = impact.tick % 2 === 0 ? 1 : -1;
      const verticalDirection = impact.normal.y === 0 ? 0 : -impact.normal.y;

      offsetX.value = withSequence(
        withTiming(horizontalDirection * magnitude, { duration: 24 }),
        withTiming(-horizontalDirection * magnitude * 0.45, { duration: 32 }),
        withTiming(0, { duration: 44 }),
      );
      offsetY.value = withSequence(
        withTiming(verticalDirection * magnitude * 0.55, { duration: 24 }),
        withTiming(-verticalDirection * magnitude * 0.2, { duration: 32 }),
        withTiming(0, { duration: 44 }),
      );
    },
    [strength],
  );

  return useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));
}
