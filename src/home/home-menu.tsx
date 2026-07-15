import { Canvas } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { type Href, Link } from 'expo-router';
import { useCallback } from 'react';
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

type MenuButtonProps = {
  accessibilityHint: string;
  href?: Href;
  label: string;
};

function playSelectionHaptic() {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.selectionAsync();
  }
}

function MenuButton({ accessibilityHint, href, label }: MenuButtonProps) {
  const { palette } = useGameTheme();
  const button = (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPressIn={playSelectionHaptic}
      style={{
        minHeight: 58,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
      }}
    >
      {({ pressed }) => {
        const color = pressed ? palette.players.bottom.glow : palette.ball.core;

        return (
          <Text
            style={{
              color,
              textAlign: 'center',
              fontSize: 26,
              fontWeight: '800',
              letterSpacing: 4,
              textShadowColor: pressed
                ? palette.players.bottom.glow
                : palette.ball.glow,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: pressed ? 14 : 3,
              transform: [{ scale: pressed ? 1.04 : 1 }],
            }}
          >
            {label}
          </Text>
        );
      }}
    </Pressable>
  );

  return href ? (
    <Link href={href} asChild>
      {button}
    </Link>
  ) : (
    button
  );
}

function MenuArenaBackground() {
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
      <Canvas style={{ flex: 1 }}>
        <Arena canvasSize={canvasSize} />
      </Canvas>
    </View>
  );
}

export function HomeMenu() {
  const { palette } = useGameTheme();

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <MenuArenaBackground />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 56,
        }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <Animated.View
          entering={FadeIn.duration(220)}
          style={{
            width: '100%',
            maxWidth: 440,
            alignSelf: 'center',
            gap: 14,
          }}
        >
          <MenuButton
            label="SOLO"
            accessibilityHint="Solo mode is coming soon"
          />
          <MenuButton
            href="/game/local"
            label="LOCAL MATCH"
            accessibilityHint="Starts a match for two players sharing this device"
          />
          <MenuButton
            label="ONLINE MATCH"
            accessibilityHint="Online mode is coming soon"
          />
          <MenuButton
            label="SETTINGS"
            accessibilityHint="Settings are coming soon"
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}
