import { Skia, type SkPathBuilder } from '@shopify/react-native-skia';
import {
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import type { BallTrailPoint } from '@/game/presentation/ball-trail';
import type { CanvasSize, SceneBall } from '@/game/rendering/types';

export function useBallTrailGeometry(
  canvasSize: SharedValue<CanvasSize>,
  trail: SharedValue<BallTrailPoint[]>,
): SceneBall['trail'] {
  const builder = useSharedValue<SkPathBuilder>(Skia.PathBuilder.Make());
  const path = useSharedValue(Skia.Path.Make());
  const start = useSharedValue({ x: 0, y: 0 });
  const end = useSharedValue({ x: 0, y: 0 });
  const hasVisibleTrail = useSharedValue(false);

  useFrameCallback(() => {
    'worklet';

    const points = trail.value;
    const { width, height } = canvasSize.value;

    if (points.length < 2 || width <= 0 || height <= 0) {
      if (hasVisibleTrail.value) {
        builder.value.reset();
        path.value = builder.value.build();
        start.value = { x: 0, y: 0 };
        end.value = { x: 0, y: 0 };
        hasVisibleTrail.value = false;
      }

      return;
    }

    const currentBuilder = builder.value;
    const oldestPoint = points[points.length - 1];
    currentBuilder.reset();
    currentBuilder.moveTo(oldestPoint.x * width, oldestPoint.y * height);

    for (let index = points.length - 2; index >= 0; index -= 1) {
      const point = points[index];
      currentBuilder.lineTo(point.x * width, point.y * height);
    }

    const newestPoint = points[0];
    path.value = currentBuilder.build();
    start.value = {
      x: oldestPoint.x * width,
      y: oldestPoint.y * height,
    };
    end.value = {
      x: newestPoint.x * width,
      y: newestPoint.y * height,
    };
    hasVisibleTrail.value = true;
  });

  return { path, start, end };
}
