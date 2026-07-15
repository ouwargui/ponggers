import {
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import type { BallState } from '@/game/engine/types';
import {
  type BallTrailPoint,
  updateBallTrail,
} from '@/game/presentation/ball-trail';

export function useBallTrail(
  ball: SharedValue<BallState>,
): SharedValue<BallTrailPoint[]> {
  const trail = useSharedValue<BallTrailPoint[]>([]);

  useFrameCallback(({ timeSinceFirstFrame }) => {
    trail.value = updateBallTrail(trail.value, ball.value, timeSinceFirstFrame);
  });

  return trail;
}
