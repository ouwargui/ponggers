import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/game/constants';
import { PlayerControlZones } from '@/game/input/player-control-zones';
import {
  usePaddleControl,
  usePaddleState,
} from '@/game/input/use-paddle-control';
import { useBallPresentation } from '@/game/presentation/use-ball-presentation';
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
  const { ball, lastImpact } = useGameLoop({
    canvasSize,
    topPaddle,
    bottomPaddle,
  });
  const ballPresentation = useBallPresentation(lastImpact);
  const topPaddleGesture = usePaddleControl(canvasSize, topPaddle);
  const bottomPaddleGesture = usePaddleControl(canvasSize, bottomPaddle);
  topPaddleGesture.simultaneousWithExternalGesture(bottomPaddleGesture);
  bottomPaddleGesture.simultaneousWithExternalGesture(topPaddleGesture);
  const geometry = useGameGeometry({
    canvasSize,
    topPaddle,
    bottomPaddle,
    ball,
    ballPresentation,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.arena }}>
      <GameScene canvasSize={canvasSize} {...geometry} />
      <PlayerControlZones
        topGesture={topPaddleGesture}
        bottomGesture={bottomPaddleGesture}
      />
      <ScoreHud
        score={{ top: 0, bottom: 0 }}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
