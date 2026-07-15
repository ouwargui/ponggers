import type { rect, SkRRect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { EntityId, PlayerId } from '@/game/engine/types';

export type CanvasSize = {
  width: number;
  height: number;
};

export type ScenePaddle = {
  id: PlayerId;
  rect: SharedValue<SkRRect>;
  color: string;
};

export type SceneBall = {
  id: EntityId;
  centerX: SharedValue<number>;
  centerY: SharedValue<number>;
  radius: SharedValue<number>;
  scaleX: SharedValue<number>;
  scaleY: SharedValue<number>;
  color: string;
};

export type GameGeometry = {
  centerLine: SharedValue<ReturnType<typeof rect>>;
  paddles: ScenePaddle[];
  balls: SceneBall[];
};
