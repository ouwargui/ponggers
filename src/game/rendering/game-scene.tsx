import {
  Canvas,
  Circle,
  Fill,
  Group,
  Rect,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';

import { colors } from '@/game/constants';
import type {
  CanvasSize,
  GameGeometry,
  SceneBall,
} from '@/game/rendering/types';

type GameSceneProps = GameGeometry & {
  canvasSize: SharedValue<CanvasSize>;
  children?: ReactNode;
};

function SquishyBall({ ball }: { ball: SceneBall }) {
  const origin = useDerivedValue(() =>
    vec(ball.centerX.value, ball.centerY.value),
  );
  const transform = useDerivedValue(() => [
    { scaleX: ball.scaleX.value },
    { scaleY: ball.scaleY.value },
  ]);

  return (
    <Group origin={origin} transform={transform}>
      <Circle
        cx={ball.centerX}
        cy={ball.centerY}
        r={ball.radius}
        color={ball.color}
      />
    </Group>
  );
}

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
        <SquishyBall key={ball.id} ball={ball} />
      ))}
    </Canvas>
  );
}
