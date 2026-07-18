import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAchievementProgress } from '@/achievements/use-achievement-progress';
import { GameThemeProvider } from '@/game/themes/game-theme-provider';
import { GAME_THEME_IDS, type GameThemeId } from '@/game/themes/theme-ids';
import { gameThemeRegistry } from '@/game/themes/theme-registry';
import {
  getAvailableGameThemeIds,
  getGameThemeUnlockAchievement,
} from '@/game/themes/theme-unlocks';
import type { GameTheme } from '@/game/themes/types';
import { GameMenu } from '@/menu/game-menu';
import { ThemedArenaBackground } from '@/menu/themed-arena-background';
import { useGamePreferences } from '@/settings/game-preferences-provider';

type ThemeCardProps = {
  isSelected: boolean;
  isUnlocked: boolean;
  onPress: () => void;
  theme: GameTheme;
  unlockDescription: string | null;
};

function ThemePreview({ theme }: { theme: GameTheme }) {
  const { palette } = theme;

  return (
    <GameThemeProvider theme={theme}>
      <View style={styles.preview}>
        <ThemedArenaBackground />
        <View
          style={[
            styles.centerLine,
            {
              backgroundColor: palette.centerLine.core,
              shadowColor: palette.centerLine.glow,
            },
          ]}
        />
        <View
          style={[
            styles.paddle,
            styles.topPaddle,
            {
              backgroundColor: palette.players.top.core,
              shadowColor: palette.players.top.glow,
            },
          ]}
        />
        <View
          style={[
            styles.ball,
            {
              backgroundColor: palette.ball.core,
              shadowColor: palette.ball.glow,
            },
          ]}
        />
        <View
          style={[
            styles.paddle,
            styles.bottomPaddle,
            {
              backgroundColor: palette.players.bottom.core,
              shadowColor: palette.players.bottom.glow,
            },
          ]}
        />
      </View>
    </GameThemeProvider>
  );
}

function ThemeCard({
  isSelected,
  isUnlocked,
  onPress,
  theme,
  unlockDescription,
}: ThemeCardProps) {
  const { effects, palette } = theme;
  const status = isSelected
    ? 'EQUIPPED'
    : isUnlocked
      ? 'TAP TO EQUIP'
      : `LOCKED · ${unlockDescription ?? 'KEEP PLAYING'}`;

  return (
    <Pressable
      accessibilityHint={
        isUnlocked
          ? `Equips the ${theme.name} visual theme`
          : unlockDescription ?? 'Complete its achievement to unlock this theme'
      }
      accessibilityLabel={`${theme.name}, ${status}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isUnlocked, selected: isSelected }}
      disabled={!isUnlocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.arena,
          borderColor: isSelected
            ? palette.players.bottom.glow
            : `${palette.centerLine.glow}55`,
          opacity: isUnlocked ? 1 : 0.72,
          shadowColor: palette.players.bottom.glow,
          shadowOpacity: isSelected ? 0.5 : 0,
        },
        pressed && isUnlocked ? styles.cardPressed : null,
      ]}
    >
      <ThemePreview theme={theme} />
      {!isUnlocked ? (
        <View
          pointerEvents="none"
          style={[styles.lockedOverlay, { backgroundColor: `${palette.arena}D8` }]}
        >
          <Text
            style={[
              styles.lockGlyph,
              { color: palette.centerLine.core },
              effects.textGlow(palette.centerLine.glow, 8),
            ]}
          >
            ◇
          </Text>
        </View>
      ) : null}
      <View style={styles.details}>
        <Text
          style={[
            styles.themeName,
            { color: palette.ball.core },
            effects.textGlow(palette.ball.glow, isSelected ? 8 : 3),
          ]}
        >
          {theme.name}
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.status,
            {
              color: isSelected
                ? palette.players.bottom.glow
                : palette.centerLine.core,
            },
            effects.textGlow(
              isSelected
                ? palette.players.bottom.glow
                : palette.centerLine.glow,
              isSelected ? 6 : 2,
            ),
          ]}
        >
          {status}
        </Text>
      </View>
    </Pressable>
  );
}

export function ThemesScreen() {
  const { achievementProgress } = useAchievementProgress();
  const { preferences, setPreference } = useGamePreferences();
  const availableThemeIds = getAvailableGameThemeIds(achievementProgress);
  const selectedThemeId = availableThemeIds.includes(preferences.themeId)
    ? preferences.themeId
    : 'neon';
  const equipTheme = useCallback(
    (themeId: GameThemeId) => {
      if (preferences.themeId === themeId) {
        return;
      }

      if (process.env.EXPO_OS === 'ios' && preferences.haptics !== 'off') {
        void Haptics.selectionAsync();
      }

      setPreference('themeId', themeId);
    },
    [preferences.haptics, preferences.themeId, setPreference],
  );

  return (
    <GameMenu>
      <View style={styles.gallery}>
        {GAME_THEME_IDS.map((themeId) => {
          const unlockAchievement = getGameThemeUnlockAchievement(themeId);

          return (
            <ThemeCard
              isSelected={selectedThemeId === themeId}
              isUnlocked={availableThemeIds.includes(themeId)}
              key={themeId}
              onPress={() => equipTheme(themeId)}
              theme={gameThemeRegistry[themeId]}
              unlockDescription={
                unlockAchievement?.description.toUpperCase() ?? null
              }
            />
          );
        })}
      </View>
    </GameMenu>
  );
}

const styles = StyleSheet.create({
  gallery: {
    gap: 18,
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  preview: {
    height: 132,
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    right: 0,
    left: 0,
    height: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
  },
  paddle: {
    position: 'absolute',
    left: '35%',
    width: '30%',
    height: 7,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  topPaddle: {
    top: 22,
  },
  bottomPaddle: {
    bottom: 22,
  },
  ball: {
    position: 'absolute',
    top: '45%',
    left: '54%',
    width: 13,
    height: 13,
    borderRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlyph: {
    fontSize: 30,
    fontWeight: '900',
  },
  details: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  themeName: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 5,
  },
  status: {
    minHeight: 14,
    marginTop: 5,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 13,
  },
});
