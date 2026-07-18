import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useGameTheme } from '@/game/themes/game-theme-provider';
import type { PauseMenuRendererProps } from '@/game/themes/types';
import { getCenteredHudTranslateY } from '@/game/presentation/hud-layout';
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

function PauseAction({
  label,
  onPress,
  hapticsLevel,
}: {
  label: string;
  onPress: () => void;
  hapticsLevel: EffectLevel;
}) {
  const { effects, palette } = useGameTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => playSelectionHaptic(hapticsLevel)}
      style={{
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      {({ pressed }) => {
        const color = pressed ? palette.players.bottom.glow : palette.ball.core;
        const glowColor = pressed
          ? palette.players.bottom.glow
          : palette.ball.glow;

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
              effects.textGlow(glowColor, pressed ? 14 : 3),
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
  const { effects, palette } = useGameTheme();
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
          style={({ pressed }) => ({
            position: 'absolute',
            top: '50%',
            right: 12,
            zIndex: 2,
            width: PAUSE_TRIGGER_SIZE,
            height: PAUSE_TRIGGER_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [
              { translateY: PAUSE_TRIGGER_TRANSLATE_Y },
              { scale: pressed ? 1.08 : 1 },
            ],
          })}
        >
          {({ pressed }) => (
            <Text
              style={[
                {
                  color: pressed
                    ? palette.players.bottom.glow
                    : palette.ball.core,
                  fontSize: 18,
                  fontWeight: '900',
                  letterSpacing: 1,
                  opacity: pressed ? 1 : 0.55,
                },
                effects.textGlow(palette.players.bottom.glow, pressed ? 12 : 0),
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
              backgroundColor: palette.arena,
              opacity: 0.88,
            }}
          />

          <View style={{ width: '100%', maxWidth: 420, gap: 16 }}>
            <View style={{ paddingBottom: 12, alignItems: 'center' }}>
              <Text
                accessibilityRole="header"
                style={[
                  {
                    color: palette.players.bottom.glow,
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: '800',
                    letterSpacing: 4,
                  },
                  effects.textGlow(palette.players.bottom.glow, 10),
                ]}
              >
                {freezesSimulation ? 'PAUSED' : 'MATCH MENU'}
              </Text>
            </View>

            <PauseAction
              label="RESUME"
              onPress={onResume}
              hapticsLevel={preferences.haptics}
            />
            {onQuit ? (
              <PauseAction
                label="QUIT MATCH"
                onPress={onQuit}
                hapticsLevel={preferences.haptics}
              />
            ) : null}
          </View>
        </Animated.View>
      )}
    </>
  );
}
