import * as Haptics from 'expo-haptics';
import { type Href, Link } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { useGameTheme } from '@/game/themes/game-theme-provider';
import { ThemedArenaBackground } from '@/menu/themed-arena-background';
import type { EffectLevel } from '@/settings/game-preferences';
import { useGamePreferences } from '@/settings/game-preferences-provider';

type GameMenuButtonProps = {
  accessibilityHint: string;
  href?: Href;
  label: string;
  onPress?: () => void;
  replace?: boolean;
};

function playSelectionHaptic(level: EffectLevel) {
  if (process.env.EXPO_OS === 'ios' && level !== 'off') {
    void Haptics.selectionAsync();
  }
}

export function GameMenuButton({
  accessibilityHint,
  href,
  label,
  onPress,
  replace = false,
}: GameMenuButtonProps) {
  const { effects, palette } = useGameTheme();
  const { preferences } = useGamePreferences();
  const button = (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => playSelectionHaptic(preferences.haptics)}
      style={styles.button}
    >
      {({ pressed }) => {
        const color = pressed ? palette.players.bottom.glow : palette.ball.core;
        const glowColor = pressed
          ? palette.players.bottom.glow
          : palette.ball.glow;

        return (
          <Text
            style={[
              styles.buttonText,
              {
                color,
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

  return href ? (
    <Link href={href} replace={replace} asChild>
      {button}
    </Link>
  ) : (
    button
  );
}

export function GameMenu({ children }: PropsWithChildren) {
  const { palette } = useGameTheme();

  return (
    <View style={[styles.screen, { backgroundColor: palette.arena }]}>
      <ThemedArenaBackground />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <Animated.View
          entering={FadeIn.duration(220).reduceMotion(ReduceMotion.Never)}
          style={styles.content}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 14,
  },
  button: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 4,
  },
});
