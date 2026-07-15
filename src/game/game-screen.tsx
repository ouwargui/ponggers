import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import {
  type GameSessionConfig,
  LOCAL_MULTIPLAYER_SESSION,
} from '@/game/session-config';
import { useGameTheme } from '@/game/themes/game-theme-provider';

type GameScreenProps = {
  session?: GameSessionConfig;
};

export function GameScreen({
  session = LOCAL_MULTIPLAYER_SESSION,
}: GameScreenProps) {
  const theme = useGameTheme();
  const MatchOverlay = theme.renderers.MatchOverlay;
  const insets = useSafeAreaInsets();
  const canvasSize = useSharedValue<CanvasSize>({ width: 0, height: 0 });
  const topPaddle = usePaddleState('top', canvasSize, insets.top);
  const bottomPaddle = usePaddleState('bottom', canvasSize, insets.bottom);
  const { ball, countdown, lastImpact, match, restartMatch } = useGameLoop({
    canvasSize,
    topPaddle,
    bottomPaddle,
  });
  const ballPresentation = useBallPresentation(ball, lastImpact);
  const controlsEnabled = match.phase.type !== 'match-ended';
  const topPaddleGesture = usePaddleControl(canvasSize, topPaddle, {
    enabled: controlsEnabled,
  });
  const bottomPaddleGesture = usePaddleControl(canvasSize, bottomPaddle, {
    enabled: controlsEnabled,
    simultaneousWith: topPaddleGesture,
  });
  const geometry = useGameGeometry({
    canvasSize,
    topPaddle,
    bottomPaddle,
    ball,
    ballPresentation,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.arena }}>
      <GameScene canvasSize={canvasSize} {...geometry} />
      <PlayerControlZones
        topGesture={topPaddleGesture}
        bottomGesture={bottomPaddleGesture}
      />
      <MatchOverlay
        match={match}
        countdown={countdown}
        hudOrientation={session.hudOrientation}
        localPlayerId={session.localPlayerId}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onRematch={restartMatch}
      />
    </View>
  );
}
