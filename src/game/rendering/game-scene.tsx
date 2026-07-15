import {
  Canvas,
  Circle,
  Fill,
  Rect,
  RoundedRect,
} from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { colors } from '@/game/constants';
import type { CanvasSize, GameGeometry } from '@/game/rendering/types';

type GameSceneProps = GameGeometry & {
  canvasSize: SharedValue<CanvasSize>;
  children?: ReactNode;
};

export function GameScene({
  canvasSize,
  centerLine,
  paddles,
  balls,
  children,
}: GameSceneProps) {
  return (
    <Canvas style={{ flex: 1 }} onSize={canvasSize}>
      <Fill color={colors.arena} />
      <Rect rect={centerLine} color={colors.centerLine} />

      {children}

      {paddles.map((paddle) => (
        <RoundedRect key={paddle.id} rect={paddle.rect} color={paddle.color} />
      ))}

      {balls.map((ball) => (
        <Circle
          key={ball.id}
          cx={ball.centerX}
          cy={ball.centerY}
          r={ball.radius}
          color={ball.color}
        />
      ))}
    </Canvas>
  );
}
