import { Canvas } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type { CanvasSize, GameGeometry } from '@/game/rendering/types';
import { useGameTheme } from '@/game/themes/game-theme-provider';

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
  const theme = useGameTheme();
  const { Arena, Ball, CenterLine, Paddle } = theme.renderers;

  return (
    <Canvas style={{ flex: 1 }} onSize={canvasSize}>
      <Arena canvasSize={canvasSize} />
      <CenterLine line={centerLine} />

      {children}

      {paddles.map((paddle) => (
        <Paddle key={paddle.id} paddle={paddle} />
      ))}

      {balls.map((ball) => (
        <Ball key={ball.id} ball={ball} />
      ))}
    </Canvas>
  );
}
