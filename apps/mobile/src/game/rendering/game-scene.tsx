import { Canvas } from '@shopify/react-native-skia';
import { type ReactNode, useCallback } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { CanvasSize, GameGeometry } from '@/game/rendering/types';
import { useGameTheme } from '@/game/themes/game-theme-provider';

type GameSceneProps = GameGeometry & {
  canvasSize: SharedValue<CanvasSize>;
  rallyHitCount: SharedValue<number>;
  trailIntensity: number;
  children?: ReactNode;
};

export function GameScene({
  canvasSize,
  rallyHitCount,
  trailIntensity,
  centerLine,
  paddles,
  balls,
  children,
}: GameSceneProps) {
  const theme = useGameTheme();
  const { Arena, Ball, CenterLine, Paddle, RallyCounter } = theme.renderers;
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;

      canvasSize.value = { width, height };
    },
    [canvasSize],
  );

  return (
    <View style={{ flex: 1 }} onLayout={handleLayout}>
      <Canvas style={{ flex: 1 }}>
        <Arena canvasSize={canvasSize} />
        <CenterLine line={centerLine} />

        {children}

        {paddles.map((paddle) => (
          <Paddle
            key={paddle.id}
            paddle={paddle}
            trailIntensity={trailIntensity}
          />
        ))}

        {balls.map((ball) => (
          <Ball key={ball.id} ball={ball} trailIntensity={trailIntensity} />
        ))}
      </Canvas>

      <RallyCounter hitCount={rallyHitCount} />
    </View>
  );
}
