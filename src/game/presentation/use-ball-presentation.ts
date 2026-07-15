import {
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { BallImpactEvent } from '@/game/engine/types';

const BASE_COMPRESSION = 0.9;
const INTENSITY_COMPRESSION = 0.14;
const EXPANSION_RATIO = 0.7;
const IMPACT_DURATION_MS = 28;
const RECOVERY_SPRING = {
  damping: 12,
  mass: 0.45,
  stiffness: 260,
};

export type BallPresentationState = {
  scaleX: SharedValue<number>;
  scaleY: SharedValue<number>;
};

export type BallSquash = {
  scaleX: number;
  scaleY: number;
};

export function getBallSquash(impact: BallImpactEvent): BallSquash {
  'worklet';

  const compression =
    BASE_COMPRESSION - impact.intensity * INTENSITY_COMPRESSION;
  const expansion = 1 + (1 - compression) * EXPANSION_RATIO;
  const hitHorizontalSurface =
    Math.abs(impact.normal.y) >= Math.abs(impact.normal.x);

  return hitHorizontalSurface
    ? { scaleX: expansion, scaleY: compression }
    : { scaleX: compression, scaleY: expansion };
}

export function useBallPresentation(
  lastImpact: SharedValue<BallImpactEvent | null>,
): BallPresentationState {
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  useAnimatedReaction(
    () => lastImpact.value,
    (impact, previousImpact) => {
      if (
        !impact ||
        (previousImpact &&
          impact.tick === previousImpact.tick &&
          impact.ballId === previousImpact.ballId)
      ) {
        return;
      }

      const squash = getBallSquash(impact);
      const impactTiming = {
        duration: IMPACT_DURATION_MS,
        easing: Easing.out(Easing.quad),
      };

      scaleX.value = withSequence(
        withTiming(squash.scaleX, impactTiming),
        withSpring(1, RECOVERY_SPRING),
      );
      scaleY.value = withSequence(
        withTiming(squash.scaleY, impactTiming),
        withSpring(1, RECOVERY_SPRING),
      );
    },
  );

  return { scaleX, scaleY };
}
