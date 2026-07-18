import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { PauseMenuRendererProps } from '@/game/themes/types';
import { voltTextGlow } from '@/game/themes/volt/volt-text-glow';
import { voltPalette } from '@/game/themes/volt/volt-tokens';
import type { EffectLevel } from '@/settings/game-preferences';
import { useGamePreferences } from '@/settings/game-preferences-provider';

function playSelectionHaptic(level: EffectLevel) {
  if (process.env.EXPO_OS === 'ios' && level !== 'off') {
    void Haptics.selectionAsync();
  }
}

function VoltPauseAction({
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
        <View style={styles.actionContent}>
          <View style={[styles.actionRail, { opacity: pressed ? 1 : 0.25 }]} />
          <Text
            style={[
              styles.actionLabel,
              {
                color: pressed
                  ? voltPalette.players.bottom.glow
                  : voltPalette.ball.core,
                transform: [{ translateX: pressed ? 4 : 0 }],
              },
              voltTextGlow(voltPalette.players.bottom.glow, pressed ? 12 : 3),
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function VoltPauseMenu({
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
            { transform: [{ translateY: -22 }, { scale: pressed ? 1.1 : 1 }] },
          ]}
        >
          {({ pressed }) => (
            <Text
              style={[
                styles.pauseGlyph,
                {
                  color: pressed
                    ? voltPalette.players.bottom.glow
                    : voltPalette.ball.core,
                  opacity: pressed ? 1 : 0.58,
                },
                voltTextGlow(voltPalette.players.bottom.glow, pressed ? 10 : 1),
              ]}
            >
              Ⅱ
            </Text>
          )}
        </Pressable>
      ) : (
        <Animated.View
          accessibilityViewIsModal
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(90)}
          style={styles.overlay}
        >
          <View pointerEvents="none" style={styles.backdrop} />

          <View style={styles.panel}>
            <View style={styles.heading}>
              <View style={styles.headingRail} />
              <Text
                accessibilityRole="header"
                style={[
                  styles.headingLabel,
                  voltTextGlow(voltPalette.players.bottom.glow, 8),
                ]}
              >
                {freezesSimulation ? 'CIRCUIT HOLD' : 'MATCH CIRCUIT'}
              </Text>
              <View style={styles.headingRail} />
            </View>

            <VoltPauseAction
              hapticsLevel={preferences.haptics}
              label="RESUME"
              onPress={onResume}
            />
            {onQuit ? (
              <VoltPauseAction
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${voltPalette.players.bottom.glow}55`,
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
    backgroundColor: voltPalette.arena,
    opacity: 0.92,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  headingRail: {
    flex: 1,
    height: 1,
    backgroundColor: voltPalette.players.bottom.glow,
    opacity: 0.48,
  },
  headingLabel: {
    color: voltPalette.players.bottom.glow,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3.2,
  },
  action: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRail: {
    width: 2,
    height: 28,
    marginRight: 12,
    backgroundColor: voltPalette.players.bottom.glow,
  },
  actionLabel: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3.5,
  },
});
