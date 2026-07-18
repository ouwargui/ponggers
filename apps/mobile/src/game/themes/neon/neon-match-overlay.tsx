import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { PlayerId } from '@/game/engine/types';
import type { HudOrientation } from '@/game/session/definition';
import { useGameTheme } from '@/game/themes/game-theme-provider';
import type { MatchOverlayRendererProps } from '@/game/themes/types';
import type { EffectLevel } from '@/settings/game-preferences';

const SCORE_EDGE_OFFSET = 72;

function getPlayerRotation(player: PlayerId, hudOrientation: HudOrientation) {
  return hudOrientation === 'face-to-face' && player === 'top'
    ? '180deg'
    : '0deg';
}

function NeonScore({
  value,
  player,
  hudOrientation,
}: {
  value: number;
  player: PlayerId;
  hudOrientation: HudOrientation;
}) {
  const { effects, palette } = useGameTheme();
  const colors = palette.players[player];
  const previousValue = useRef(value);
  const scale = useSharedValue(1);
  const rotation = getPlayerRotation(player, hudOrientation);

  useEffect(() => {
    if (value === previousValue.current) {
      return;
    }

    previousValue.current = value;
    scale.value = withSequence(
      withTiming(1.45, {
        duration: 110,
        easing: Easing.out(Easing.cubic),
      }),
      withSpring(1, { damping: 10, stiffness: 240 }),
    );
  }, [scale, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: rotation }, { scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[
        styles.score,
        {
          color: colors.core,
        },
        effects.textGlow(colors.glow, 12),
        animatedStyle,
      ]}
    >
      {value}
    </Animated.Text>
  );
}

function CountdownBeat({
  value,
  rotation,
}: {
  value: number;
  rotation: string;
}) {
  const { effects, palette } = useGameTheme();
  const scale = useSharedValue(0.65);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = value === 1 ? 0.6 : 0.65;
    opacity.value = 0;
    scale.value = withSequence(
      withTiming(1.18, {
        duration: 140,
        easing: Easing.out(Easing.cubic),
      }),
      withSpring(1, { damping: 11, stiffness: 260 }),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 55 }),
      withDelay(290, withTiming(0, { duration: 160 })),
    );
  }, [opacity, scale, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: rotation }, { scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[
        styles.countdown,
        { color: palette.ball.core },
        effects.textGlow(palette.ball.glow, 24),
        animatedStyle,
      ]}
    >
      {value}
    </Animated.Text>
  );
}

function PointCallout({
  player,
  hudOrientation,
}: {
  player: PlayerId;
  hudOrientation: HudOrientation;
}) {
  const { effects, palette } = useGameTheme();
  const colors = palette.players[player];
  const scale = useSharedValue(0.78);
  const opacity = useSharedValue(0);
  const rotation = getPlayerRotation(player, hudOrientation);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 90 }),
      withDelay(350, withTiming(0, { duration: 160 })),
    );
    scale.value = withSequence(
      withTiming(1.12, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
      }),
      withSpring(1, { damping: 12, stiffness: 240 }),
    );
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: rotation }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pointCallout,
        player === 'top' ? styles.topCallout : styles.bottomCallout,
        animatedStyle,
      ]}
    >
      <Text
        style={[
          styles.pointText,
          { color: colors.core },
          effects.textGlow(colors.glow, 18),
        ]}
      >
        POINT
      </Text>
      <Text style={[styles.playerLabel, { color: colors.glow }]}>
        {colors.label}
      </Text>
    </Animated.View>
  );
}

function PointWash({ player }: { player: PlayerId }) {
  const { palette } = useGameTheme();
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.2, { duration: 100 }),
      withTiming(0.06, { duration: 220 }),
      withTiming(0, { duration: 260 }),
    );
  }, [opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pointWash,
        player === 'top' ? styles.topWash : styles.bottomWash,
        { backgroundColor: palette.players[player].glow },
        animatedStyle,
      ]}
    />
  );
}

function RematchButton({
  color,
  hapticsLevel,
  onPress,
}: {
  color: string;
  hapticsLevel: EffectLevel;
  onPress: () => void;
}) {
  const handlePress = () => {
    if (hapticsLevel !== 'off') {
      void Haptics.selectionAsync();
    }
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start a rematch"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.rematchButton,
        {
          borderColor: color,
          opacity: pressed ? 0.65 : 1,
          shadowColor: color,
        },
      ]}
    >
      <Text style={[styles.rematchText, { color }]}>REMATCH</Text>
    </Pressable>
  );
}

function ResultPanel({
  player,
  winner,
  hudOrientation,
  hapticsLevel,
  onRematch,
}: {
  player: PlayerId;
  winner: PlayerId;
  hudOrientation: HudOrientation;
  hapticsLevel: EffectLevel;
  onRematch: () => void;
}) {
  const { effects, palette } = useGameTheme();
  const winnerColors = palette.players[winner];
  const rotation = getPlayerRotation(player, hudOrientation);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 180 });
    scale.value = withSpring(1, { damping: 11, stiffness: 210 });
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: rotation }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.resultContent, animatedStyle]}>
      <Text
        style={[
          styles.resultTitle,
          {
            color: winnerColors.core,
          },
          effects.textGlow(winnerColors.glow, 22),
        ]}
      >
        {player === winner ? 'YOU WIN' : 'YOU LOSE'}
      </Text>
      <Text style={[styles.resultSubtitle, { color: winnerColors.glow }]}>
        {winnerColors.label} WINS
      </Text>
      <RematchButton
        color={winnerColors.glow}
        hapticsLevel={hapticsLevel}
        onPress={onRematch}
      />
    </Animated.View>
  );
}

function MatchResult({
  winner,
  hudOrientation,
  localPlayerId,
  hapticsLevel,
  onRematch,
}: {
  winner: PlayerId;
  hudOrientation: HudOrientation;
  localPlayerId: PlayerId | null;
  hapticsLevel: EffectLevel;
  onRematch: () => void;
}) {
  if (hudOrientation === 'face-to-face') {
    return (
      <View style={styles.faceResult}>
        <View style={[styles.resultHalf, styles.topResultHalf]}>
          <ResultPanel
            player="top"
            winner={winner}
            hudOrientation={hudOrientation}
            hapticsLevel={hapticsLevel}
            onRematch={onRematch}
          />
        </View>
        <View style={[styles.resultHalf, styles.bottomResultHalf]}>
          <ResultPanel
            player="bottom"
            winner={winner}
            hudOrientation={hudOrientation}
            hapticsLevel={hapticsLevel}
            onRematch={onRematch}
          />
        </View>
      </View>
    );
  }

  const player = localPlayerId ?? winner;

  return (
    <View style={styles.screenResult}>
      <ResultPanel
        player={player}
        winner={winner}
        hudOrientation={hudOrientation}
        hapticsLevel={hapticsLevel}
        onRematch={onRematch}
      />
    </View>
  );
}

export function NeonMatchOverlay({
  match,
  countdown,
  hudOrientation,
  localPlayerId,
  topInset,
  bottomInset,
  hapticsLevel,
  onRematch,
}: MatchOverlayRendererProps) {
  const { palette } = useGameTheme();
  const backdropOpacity = useSharedValue(
    match.phase.type === 'playing' ? 0 : 0.28,
  );

  useEffect(() => {
    const targetOpacity =
      match.phase.type === 'playing'
        ? 0
        : match.phase.type === 'match-ended'
          ? 0.58
          : 0.28;

    backdropOpacity.value = withTiming(targetOpacity, { duration: 180 });
  }, [backdropOpacity, match.phase.type]);

  useEffect(() => {
    if (hapticsLevel === 'off' || countdown === null) {
      return;
    }

    void Haptics.impactAsync(
      hapticsLevel === 'full' && countdown === 1
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
  }, [countdown, hapticsLevel]);

  useEffect(() => {
    if (hapticsLevel === 'off') {
      return;
    }

    if (match.phase.type === 'point-scored') {
      if (hapticsLevel === 'full') {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else if (match.phase.type === 'match-ended') {
      void Haptics.impactAsync(
        hapticsLevel === 'full'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium,
      );
    }
  }, [hapticsLevel, match.phase.type]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const pointScorer =
    match.phase.type === 'point-scored' ? match.phase.scorer : null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdrop,
          { backgroundColor: palette.arena },
          backdropStyle,
        ]}
      />

      {pointScorer && (
        <PointWash
          key={`wash-${match.score.top}-${match.score.bottom}`}
          player={pointScorer}
        />
      )}

      <View
        pointerEvents="none"
        style={[
          styles.scores,
          {
            paddingTop: topInset + SCORE_EDGE_OFFSET,
            paddingBottom: bottomInset + SCORE_EDGE_OFFSET,
          },
        ]}
      >
        <NeonScore
          player="top"
          value={match.score.top}
          hudOrientation={hudOrientation}
        />
        <NeonScore
          player="bottom"
          value={match.score.bottom}
          hudOrientation={hudOrientation}
        />
      </View>

      {pointScorer && (
        <PointCallout
          key={`point-${match.score.top}-${match.score.bottom}`}
          player={pointScorer}
          hudOrientation={hudOrientation}
        />
      )}

      {countdown !== null && hudOrientation === 'screen' && (
        <View pointerEvents="none" style={styles.screenCountdown}>
          <CountdownBeat value={countdown} rotation="0deg" />
        </View>
      )}

      {countdown !== null && hudOrientation === 'face-to-face' && (
        <View pointerEvents="none" style={styles.faceCountdown}>
          <View style={[styles.countdownHalf, styles.topCountdownHalf]}>
            <CountdownBeat value={countdown} rotation="180deg" />
          </View>
          <View style={[styles.countdownHalf, styles.bottomCountdownHalf]}>
            <CountdownBeat value={countdown} rotation="0deg" />
          </View>
        </View>
      )}

      {match.phase.type === 'match-ended' && (
        <MatchResult
          winner={match.phase.winner}
          hudOrientation={hudOrientation}
          localPlayerId={localPlayerId}
          hapticsLevel={hapticsLevel}
          onRematch={onRematch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  scores: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  score: {
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  countdown: {
    fontSize: 76,
    fontWeight: '800',
    textAlign: 'center',
  },
  screenCountdown: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceCountdown: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  countdownHalf: {
    alignItems: 'center',
    flex: 1,
  },
  topCountdownHalf: {
    justifyContent: 'flex-end',
    paddingBottom: 28,
  },
  bottomCountdownHalf: {
    justifyContent: 'flex-start',
    paddingTop: 28,
  },
  pointWash: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  topWash: {
    height: '50%',
    top: 0,
  },
  bottomWash: {
    bottom: 0,
    height: '50%',
  },
  pointCallout: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  topCallout: {
    top: '28%',
  },
  bottomCallout: {
    bottom: '28%',
  },
  pointText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 3,
  },
  playerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 4,
  },
  faceResult: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  resultHalf: {
    alignItems: 'center',
    flex: 1,
  },
  topResultHalf: {
    justifyContent: 'flex-end',
    paddingBottom: 54,
  },
  bottomResultHalf: {
    justifyContent: 'flex-start',
    paddingTop: 54,
  },
  screenResult: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2,
  },
  resultSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 6,
  },
  rematchButton: {
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 11,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  rematchText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
});
