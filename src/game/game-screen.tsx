import { useCallback } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PaddleInput } from '@/game/engine/types';
import { usePaddleHitHaptics } from '@/game/feedback/use-paddle-hit-haptics';
import { PlayerControlZones } from '@/game/input/player-control-zones';
import { useBallPresentation } from '@/game/presentation/use-ball-presentation';
import { GameScene } from '@/game/rendering/game-scene';
import type { CanvasSize } from '@/game/rendering/types';
import { useGameGeometry } from '@/game/rendering/use-game-geometry';
import { useGameLoop } from '@/game/runtime/use-game-loop';
import {
  type GameSessionDefinition,
  LOCAL_MULTIPLAYER_SESSION,
} from '@/game/session/definition';
import type { SessionTransport } from '@/game/session/transport';
import { useSessionControls } from '@/game/session/use-session-controls';
import { useSessionPaddles } from '@/game/session/use-session-paddles';
import { useGameTheme } from '@/game/themes/game-theme-provider';

type GameScreenProps = {
  session?: GameSessionDefinition;
  transport?: SessionTransport;
};

export function GameScreen({
  session = LOCAL_MULTIPLAYER_SESSION,
  transport,
}: GameScreenProps) {
  const theme = useGameTheme();
  const MatchOverlay = theme.renderers.MatchOverlay;
  const insets = useSafeAreaInsets();
  const canvasSize = useSharedValue<CanvasSize>({ width: 0, height: 0 });
  const paddles = useSessionPaddles(canvasSize, insets);
  const { ball, countdown, lastImpact, match, restartMatch, simulationTick } =
    useGameLoop({
      canvasSize,
      topPaddle: paddles.top,
      bottomPaddle: paddles.bottom,
    });
  usePaddleHitHaptics(lastImpact, session);
  const ballPresentation = useBallPresentation(ball, lastImpact);
  const controlsEnabled = match.phase.type !== 'match-ended';
  const sendLocalInput = useCallback(
    (input: PaddleInput) => {
      transport?.send(input);
    },
    [transport],
  );
  const controls = useSessionControls({
    session,
    canvasSize,
    paddles,
    simulationTick,
    enabled: controlsEnabled,
    onLocalInput:
      session.mode === 'online-multiplayer' && transport
        ? sendLocalInput
        : undefined,
  });
  const geometry = useGameGeometry({
    canvasSize,
    topPaddle: paddles.top,
    bottomPaddle: paddles.bottom,
    ball,
    ballPresentation,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.arena }}>
      <GameScene canvasSize={canvasSize} {...geometry} />
      <PlayerControlZones
        topGesture={controls.top}
        bottomGesture={controls.bottom}
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
