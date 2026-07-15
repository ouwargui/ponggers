import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/game/constants';
import {
  usePaddleControl,
  usePaddleState,
} from '@/game/input/use-paddle-control';
import { GameScene } from '@/game/rendering/game-scene';
import type { CanvasSize } from '@/game/rendering/types';
import { useGameGeometry } from '@/game/rendering/use-game-geometry';
import { useGameLoop } from '@/game/runtime/use-game-loop';
import { ScoreHud } from '@/game/ui/score-hud';

export function GameScreen() {
  const insets = useSafeAreaInsets();
  const canvasSize = useSharedValue<CanvasSize>({ width: 0, height: 0 });
  const topPaddle = usePaddleState('top', canvasSize, insets.top);
  const bottomPaddle = usePaddleState('bottom', canvasSize, insets.bottom);
  const { ball } = useGameLoop({ canvasSize, topPaddle, bottomPaddle });
  const bottomPaddleGesture = usePaddleControl(canvasSize, bottomPaddle);
  const geometry = useGameGeometry({
    canvasSize,
    topPaddle,
    bottomPaddle,
    ball,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.arena }}>
      <GestureDetector gesture={bottomPaddleGesture}>
        <GameScene canvasSize={canvasSize} {...geometry} />
      </GestureDetector>
      <ScoreHud
        score={{ top: 0, bottom: 0 }}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
