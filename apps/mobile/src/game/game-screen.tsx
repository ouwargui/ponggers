import { useDeferredSystemGestures } from '@modules/system-gestures';
import { useCallback } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AiDifficulty } from '@/game/ai/ai-difficulty';
import type { PaddleInput } from '@/game/engine/types';
import { usePaddleHitHaptics } from '@/game/feedback/use-paddle-hit-haptics';
import { PlayerControlZones } from '@/game/input/player-control-zones';
import { useGamePauseMenu } from '@/game/pause/use-game-pause-menu';
import { useBallPresentation } from '@/game/presentation/use-ball-presentation';
import { useImpactScreenShake } from '@/game/presentation/use-impact-screen-shake';
import { GameScene } from '@/game/rendering/game-scene';
import type { CanvasSize } from '@/game/rendering/types';
import { useGameGeometry } from '@/game/rendering/use-game-geometry';
import { useGameLoop } from '@/game/runtime/use-game-loop';
import {
  type GameSessionDefinition,
  getAiControlledPlayer,
  getLatencyIndicatorPlayer,
  LOCAL_MULTIPLAYER_SESSION,
} from '@/game/session/definition';
import type { SessionTransport } from '@/game/session/transport';
import { useOnlineMatchRecovery } from '@/game/session/use-online-match-recovery';
import { useOnlinePaddleLayout } from '@/game/session/use-online-paddle-layout';
import { useOnlineRallyEvents } from '@/game/session/use-online-rally-events';
import { useOnlineRematch } from '@/game/session/use-online-rematch';
import { useRemotePaddleInput } from '@/game/session/use-remote-paddle-input';
import { useSessionControls } from '@/game/session/use-session-controls';
import { useSessionPaddlePresentations } from '@/game/session/use-session-paddle-presentations';
import { useSessionPaddles } from '@/game/session/use-session-paddles';
import { useTransportLatency } from '@/game/session/use-transport-latency';
import { useGameTheme } from '@/game/themes/game-theme-provider';
import {
  EFFECT_LEVEL_MULTIPLIER,
  type EffectLevel,
} from '@/settings/game-preferences';
import { useGamePreferences } from '@/settings/game-preferences-provider';

type GameScreenProps = {
  aiDifficulty?: AiDifficulty;
  session?: GameSessionDefinition;
  transport?: SessionTransport;
  hapticsEnabled?: boolean;
  onQuit?: () => void;
};

export function GameScreen({
  aiDifficulty,
  session = LOCAL_MULTIPLAYER_SESSION,
  transport,
  hapticsEnabled = true,
  onQuit,
}: GameScreenProps) {
  useDeferredSystemGestures();
  const theme = useGameTheme();
  const { preferences } = useGamePreferences();
  const MatchOverlay = theme.renderers.MatchOverlay;
  const LatencyIndicator = theme.renderers.LatencyIndicator;
  const PauseMenu = theme.renderers.PauseMenu;
  const insets = useSafeAreaInsets();
  const canvasSize = useSharedValue<CanvasSize>({ width: 0, height: 0 });
  const paddles = useSessionPaddles(canvasSize, insets);
  const pauseMenu = useGamePauseMenu({ session, onQuit });
  const isOnline = session.mode === 'online-multiplayer';
  const aiPlayerId = getAiControlledPlayer(session);
  const sendRallyEvent = useCallback(
    (event: Parameters<SessionTransport['send']>[0]) => {
      transport?.send(event);
    },
    [transport],
  );
  const gameLoop = useGameLoop({
    aiDifficulty,
    canvasSize,
    topPaddle: paddles.top,
    bottomPaddle: paddles.bottom,
    aiPlayerId,
    onlineRole: isOnline ? session.onlineRole : null,
    onRallyEvent: isOnline && transport ? sendRallyEvent : undefined,
    paused: pauseMenu.simulationPaused,
  });
  useRemotePaddleInput({
    session,
    transport: isOnline ? transport : undefined,
    paddles,
  });
  useOnlinePaddleLayout({ session, transport, paddles });
  useOnlineRallyEvents({
    session,
    transport,
    onEvent: gameLoop.applyRallyEvent,
  });
  useOnlineMatchRecovery({
    session,
    transport,
    createMatchState: gameLoop.createMatchState,
    applyMatchState: gameLoop.applyMatchState,
  });
  const latencyMs = useTransportLatency(
    session.mode === 'online-multiplayer' ? transport : undefined,
  );
  const latencyPlayer = getLatencyIndicatorPlayer(session);
  const {
    ball,
    countdown,
    lastImpact,
    match,
    rallyHitCount,
    restartMatch,
    simulationTick,
  } = gameLoop;
  const handleRematch = useOnlineRematch({
    session,
    transport,
    restartMatch,
  });
  const hapticsLevel: EffectLevel = hapticsEnabled
    ? preferences.haptics
    : 'off';
  const trailIntensity = EFFECT_LEVEL_MULTIPLIER[preferences.trails];
  const screenShakeStrength = EFFECT_LEVEL_MULTIPLIER[preferences.screenShake];
  usePaddleHitHaptics(lastImpact, hapticsLevel);
  const screenShakeStyle = useImpactScreenShake(
    lastImpact,
    screenShakeStrength,
  );
  const ballPresentation = useBallPresentation(ball, lastImpact);
  const paddlePresentations = useSessionPaddlePresentations(
    session,
    paddles,
    lastImpact,
  );
  const controlsEnabled =
    match.phase.type !== 'match-ended' && !pauseMenu.isOpen;
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
    interactionActive: paddlePresentations.interactionActive,
    onLocalInput: isOnline && transport ? sendLocalInput : undefined,
  });
  const geometry = useGameGeometry({
    canvasSize,
    topPaddle: paddles.top,
    bottomPaddle: paddles.bottom,
    ball,
    ballPresentation,
    paddlePresentation: paddlePresentations.players,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.arena }}>
      <Animated.View style={[{ flex: 1 }, screenShakeStyle]}>
        <GameScene
          canvasSize={canvasSize}
          rallyHitCount={rallyHitCount}
          trailIntensity={trailIntensity}
          {...geometry}
        />
      </Animated.View>
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
        hapticsLevel={hapticsLevel}
        onRematch={handleRematch}
      />
      <PauseMenu
        freezesSimulation={pauseMenu.freezesSimulation}
        isOpen={pauseMenu.isOpen}
        onOpen={pauseMenu.open}
        onQuit={onQuit ? pauseMenu.quit : null}
        onResume={pauseMenu.resume}
      />
      {latencyMs !== null && latencyPlayer !== null ? (
        <LatencyIndicator
          latencyMs={latencyMs}
          player={latencyPlayer}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      ) : null}
    </View>
  );
}
