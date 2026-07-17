import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useGameTheme } from '@/game/themes/game-theme-provider';
import { neonTextGlow } from '@/game/themes/neon/neon-text-glow';
import { GameMenu, GameMenuButton, GameMenuTitle } from '@/menu/game-menu';
import {
  EFFECT_LEVEL_MULTIPLIER,
  EFFECT_LEVELS,
  type EffectLevel,
  formatPreferenceValue,
  getNextOption,
} from '@/settings/game-preferences';
import { useGamePreferences } from '@/settings/game-preferences-provider';

type PreferenceRowProps = {
  accessibilityHint: string;
  label: string;
  onPress: () => void;
  preview?: 'shake' | 'trail';
  previewStrength?: number;
  value: string;
};

function PreferenceRow({
  accessibilityHint,
  label,
  onPress,
  preview,
  previewStrength = 1,
  value,
}: PreferenceRowProps) {
  const { palette } = useGameTheme();
  const previewOffset = useSharedValue(0);
  const previewStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: previewOffset.value }],
  }));
  const handlePress = useCallback(() => {
    onPress();

    if (preview === 'shake' && previewStrength > 0) {
      previewOffset.value = withSequence(
        withTiming(5 * previewStrength, { duration: 35 }),
        withTiming(-3 * previewStrength, { duration: 42 }),
        withTiming(0, { duration: 55 }),
      );
    }
  }, [onPress, preview, previewOffset, previewStrength]);

  return (
    <Animated.View style={previewStyle}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={`${label}, ${value}`}
        accessibilityRole="button"
        onPress={handlePress}
        style={styles.preference}
      >
        {({ pressed }) => (
          <>
            <Text
              style={[
                styles.preferenceLabel,
                { color: palette.ball.core },
                neonTextGlow(palette.ball.glow, pressed ? 7 : 2),
              ]}
            >
              {label}
            </Text>
            <Text
              style={[
                styles.preferenceValue,
                { color: palette.players.bottom.glow },
                neonTextGlow(palette.players.bottom.glow, pressed ? 12 : 5),
              ]}
            >
              {value}
            </Text>
            {preview === 'trail' ? (
              <View
                pointerEvents="none"
                style={[
                  styles.trailPreview,
                  {
                    backgroundColor: palette.players.bottom.core,
                    opacity: previewStrength,
                    shadowColor: palette.players.bottom.glow,
                  },
                ]}
              />
            ) : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function playHapticPreview(level: EffectLevel) {
  if (level === 'off') {
    return;
  }

  void Haptics.impactAsync(
    level === 'full'
      ? Haptics.ImpactFeedbackStyle.Heavy
      : Haptics.ImpactFeedbackStyle.Light,
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const { preferences, resetPreferences, setPreference } = useGamePreferences();
  const cycleEffect = useCallback(
    (key: 'haptics' | 'screenShake' | 'trails') => {
      const next = getNextOption(preferences[key], EFFECT_LEVELS);
      setPreference(key, next);

      if (key === 'haptics') {
        playHapticPreview(next);
      }
    },
    [preferences, setPreference],
  );
  const finish = useCallback(() => {
    router.replace('/');
  }, [router]);

  return (
    <GameMenu>
      <GameMenuTitle>SETTINGS</GameMenuTitle>
      <View style={styles.preferences}>
        <PreferenceRow
          accessibilityHint="Cycles haptic feedback between off, subtle, and full"
          label="HAPTICS"
          onPress={() => cycleEffect('haptics')}
          value={formatPreferenceValue(preferences.haptics)}
        />
        <PreferenceRow
          accessibilityHint="Cycles impact camera shake between off, subtle, and full"
          label="SCREEN SHAKE"
          onPress={() => cycleEffect('screenShake')}
          preview="shake"
          previewStrength={EFFECT_LEVEL_MULTIPLIER[preferences.screenShake]}
          value={formatPreferenceValue(preferences.screenShake)}
        />
        <PreferenceRow
          accessibilityHint="Cycles ball and paddle trails between off, subtle, and full"
          label="TRAILS"
          onPress={() => cycleEffect('trails')}
          preview="trail"
          previewStrength={EFFECT_LEVEL_MULTIPLIER[preferences.trails]}
          value={formatPreferenceValue(preferences.trails)}
        />
      </View>
      <View style={styles.actions}>
        <GameMenuButton
          accessibilityHint="Restores all game preferences to their defaults"
          label="RESET DEFAULTS"
          onPress={resetPreferences}
        />
        <GameMenuButton
          accessibilityHint="Saves settings and returns to the main menu"
          label="DONE"
          onPress={finish}
        />
      </View>
    </GameMenu>
  );
}

const styles = StyleSheet.create({
  preferences: {
    gap: 4,
  },
  preference: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  preferenceLabel: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  preferenceValue: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
  },
  trailPreview: {
    width: 72,
    height: 2,
    marginTop: 7,
    borderRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
  },
  actions: {
    marginTop: 14,
    gap: 2,
  },
});
