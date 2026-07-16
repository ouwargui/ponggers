import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { neonTextGlow } from '@/game/themes/neon/neon-text-glow';
import { neonPalette } from '@/game/themes/neon/neon-tokens';
import type { PauseMenuRendererProps } from '@/game/themes/types';

function playSelectionHaptic() {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.selectionAsync();
  }
}

function PauseAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={playSelectionHaptic}
      style={{
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      {({ pressed }) => {
        const color = pressed
          ? neonPalette.players.bottom.glow
          : neonPalette.ball.core;
        const glowColor = pressed
          ? neonPalette.players.bottom.glow
          : neonPalette.ball.glow;

        return (
          <Text
            style={[
              {
                color,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: '800',
                letterSpacing: 3.5,
                transform: [{ scale: pressed ? 1.04 : 1 }],
              },
              neonTextGlow(glowColor, pressed ? 14 : 3),
            ]}
          >
            {label}
          </Text>
        );
      }}
    </Pressable>
  );
}

export function NeonPauseMenu({
  freezesSimulation,
  isOpen,
  onOpen,
  onQuit,
  onResume,
}: PauseMenuRendererProps) {
  return (
    <>
      {!isOpen ? (
        <Pressable
          accessibilityHint="Opens the match menu"
          accessibilityLabel="Pause"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onOpen}
          onPressIn={playSelectionHaptic}
          style={({ pressed }) => ({
            position: 'absolute',
            top: '50%',
            right: 12,
            zIndex: 2,
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: -22 }, { scale: pressed ? 1.08 : 1 }],
          })}
        >
          {({ pressed }) => (
            <Text
              style={[
                {
                  color: pressed
                    ? neonPalette.players.bottom.glow
                    : neonPalette.ball.core,
                  fontSize: 18,
                  fontWeight: '900',
                  letterSpacing: 1,
                  opacity: pressed ? 1 : 0.55,
                },
                neonTextGlow(neonPalette.players.bottom.glow, pressed ? 12 : 0),
              ]}
            >
              Ⅱ
            </Text>
          )}
        </Pressable>
      ) : (
        <Animated.View
          accessibilityViewIsModal
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: neonPalette.arena,
              opacity: 0.88,
            }}
          />

          <View style={{ width: '100%', maxWidth: 420, gap: 16 }}>
            <View style={{ paddingBottom: 12, alignItems: 'center' }}>
              <Text
                accessibilityRole="header"
                style={[
                  {
                    color: neonPalette.players.bottom.glow,
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: '800',
                    letterSpacing: 4,
                  },
                  neonTextGlow(neonPalette.players.bottom.glow, 10),
                ]}
              >
                {freezesSimulation ? 'PAUSED' : 'MATCH MENU'}
              </Text>
            </View>

            <PauseAction label="RESUME" onPress={onResume} />
            {onQuit ? (
              <PauseAction label="QUIT MATCH" onPress={onQuit} />
            ) : null}
          </View>
        </Animated.View>
      )}
    </>
  );
}
