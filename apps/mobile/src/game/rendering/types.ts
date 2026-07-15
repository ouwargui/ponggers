import type {
  rect,
  SkPath,
  SkPoint,
  SkRRect,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { EntityId, PlayerId } from '@/game/engine/types';

export type CanvasSize = {
  width: number;
  height: number;
};

export type ScenePaddle = {
  id: PlayerId;
  rect: SharedValue<SkRRect>;
};

export type SceneBall = {
  id: EntityId;
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  radius: SharedValue<number>;
  scaleX: SharedValue<number>;
  scaleY: SharedValue<number>;
  lastHitBy: SharedValue<PlayerId | null>;
  trail: {
    path: SharedValue<SkPath>;
    start: SharedValue<SkPoint>;
    end: SharedValue<SkPoint>;
  };
};

export type GameGeometry = {
  centerLine: SharedValue<ReturnType<typeof rect>>;
  paddles: ScenePaddle[];
  balls: SceneBall[];
};
