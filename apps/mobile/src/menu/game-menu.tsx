import { Canvas } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { type Href, Link } from 'expo-router';
import { type PropsWithChildren, useCallback } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, useSharedValue } from 'react-native-reanimated';

import type { CanvasSize } from '@/game/rendering/types';
import { useGameTheme } from '@/game/themes/game-theme-provider';
import { neonTextGlow } from '@/game/themes/neon/neon-text-glow';

type GameMenuButtonProps = {
  accessibilityHint: string;
  href?: Href;
  label: string;
};

function playSelectionHaptic() {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.selectionAsync();
  }
}

export function GameMenuButton({
  accessibilityHint,
  href,
  label,
}: GameMenuButtonProps) {
  const { palette } = useGameTheme();
  const button = (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPressIn={playSelectionHaptic}
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
              neonTextGlow(glowColor, pressed ? 14 : 3),
            ]}
          >
            {label}
          </Text>
        );
      }}
    </Pressable>
  );

  return href ? (
    <Link href={href} replace asChild>
      {button}
    </Link>
  ) : (
    button
  );
}

function GameMenuArena() {
  const { renderers } = useGameTheme();
  const { Arena } = renderers;
  const canvasSize = useSharedValue<CanvasSize>({ width: 0, height: 0 });
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;

      canvasSize.value = { width, height };
    },
    [canvasSize],
  );

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={handleLayout}
    >
      <Canvas style={styles.canvas}>
        <Arena canvasSize={canvasSize} />
      </Canvas>
    </View>
  );
}

export function GameMenuTitle({ children }: PropsWithChildren) {
  const { palette } = useGameTheme();

  return (
    <View style={styles.titleContainer}>
      <Text
        style={[
          styles.title,
          { color: palette.players.bottom.glow },
          neonTextGlow(palette.players.bottom.glow, 8),
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function GameMenu({ children }: PropsWithChildren) {
  const { palette } = useGameTheme();

  return (
    <View style={[styles.screen, { backgroundColor: palette.arena }]}>
      <GameMenuArena />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <Animated.View entering={FadeIn.duration(220)} style={styles.content}>
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
  canvas: {
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
  titleContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 7,
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
