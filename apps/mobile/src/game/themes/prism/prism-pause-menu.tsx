import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { prismTextGlow } from '@/game/themes/prism/prism-text-glow';
import { getCenteredHudTranslateY } from '@/game/presentation/hud-layout';
import {
  PRISM_SPECTRUM,
  prismPalette,
} from '@/game/themes/prism/prism-tokens';
import type { PauseMenuRendererProps } from '@/game/themes/types';
import type { EffectLevel } from '@/settings/game-preferences';
import { useGamePreferences } from '@/settings/game-preferences-provider';

const PAUSE_TRIGGER_SIZE = 44;
const PAUSE_TRIGGER_TRANSLATE_Y =
  getCenteredHudTranslateY(PAUSE_TRIGGER_SIZE);

function playSelectionHaptic(level: EffectLevel) {
  if (process.env.EXPO_OS === 'ios' && level !== 'off') {
    void Haptics.selectionAsync();
  }
}

function PrismSpectrumRail() {
  return (
    <View pointerEvents="none" style={styles.spectrumRail}>
      {PRISM_SPECTRUM.map((color) => (
        <View key={color} style={[styles.spectrumBand, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function PrismPauseAction({
  hapticsLevel,
  label,
  onPress,
}: {
  hapticsLevel: EffectLevel;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => playSelectionHaptic(hapticsLevel)}
      style={styles.action}
    >
      {({ pressed }) => (
        <View style={[styles.actionGlass, { opacity: pressed ? 1 : 0.72 }]}>
          <Text
            style={[
              styles.actionLabel,
              {
                color: pressed
                  ? prismPalette.players.bottom.core
                  : prismPalette.ball.core,
                transform: [{ scale: pressed ? 1.035 : 1 }],
              },
              prismTextGlow(
                pressed
                  ? prismPalette.players.bottom.glow
                  : prismPalette.ball.glow,
                pressed ? 12 : 3,
              ),
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function PrismPauseMenu({
  freezesSimulation,
  isOpen,
  onOpen,
  onQuit,
  onResume,
}: PauseMenuRendererProps) {
  const { preferences } = useGamePreferences();

  return (
    <>
      {!isOpen ? (
        <Pressable
          accessibilityHint="Opens the match menu"
          accessibilityLabel="Pause"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onOpen}
          onPressIn={() => playSelectionHaptic(preferences.haptics)}
          style={({ pressed }) => [
            styles.pauseTrigger,
            {
              borderColor: prismPalette.players.bottom.glow,
              opacity: pressed ? 1 : 0.64,
              transform: [
                { translateY: PAUSE_TRIGGER_TRANSLATE_Y },
                { scale: pressed ? 1.08 : 1 },
              ],
            },
          ]}
        >
          {({ pressed }) => (
            <Text
              style={[
                styles.pauseGlyph,
                { color: prismPalette.ball.core },
                prismTextGlow(
                  prismPalette.players.bottom.glow,
                  pressed ? 11 : 3,
                ),
              ]}
            >
              Ⅱ
            </Text>
          )}
        </Pressable>
      ) : (
        <Animated.View
          accessibilityViewIsModal
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(100)}
          style={styles.overlay}
        >
          <View pointerEvents="none" style={styles.backdrop} />

          <View style={styles.panel}>
            <Text
              accessibilityRole="header"
              style={[
                styles.heading,
                prismTextGlow(prismPalette.centerLine.glow, 9),
              ]}
            >
              {freezesSimulation ? 'LIGHT SUSPENDED' : 'MATCH REFRACTION'}
            </Text>
            <PrismSpectrumRail />
            <PrismPauseAction
              hapticsLevel={preferences.haptics}
              label="RESUME"
              onPress={onResume}
            />
            {onQuit ? (
              <PrismPauseAction
                hapticsLevel={preferences.haptics}
                label="QUIT MATCH"
                onPress={onQuit}
              />
            ) : null}
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pauseTrigger: {
    position: 'absolute',
    top: '50%',
    right: 12,
    zIndex: 2,
    width: PAUSE_TRIGGER_SIZE,
    height: PAUSE_TRIGGER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  pauseGlyph: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: prismPalette.arena,
    opacity: 0.9,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: `${prismPalette.centerLine.glow}42`,
    borderRadius: 24,
    backgroundColor: `${prismPalette.arena}D6`,
  },
  heading: {
    color: prismPalette.ball.core,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3.2,
  },
  spectrumRail: {
    height: 2,
    flexDirection: 'row',
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 1,
  },
  spectrumBand: {
    flex: 1,
  },
  action: {
    minHeight: 56,
    justifyContent: 'center',
  },
  actionGlass: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${prismPalette.ball.core}20`,
    borderRadius: 16,
    backgroundColor: `${prismPalette.ball.core}08`,
  },
  actionLabel: {
    textAlign: 'center',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 3.5,
  },
});
