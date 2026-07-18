import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type AchievementProgress,
  getUnlockedThemeRewardIds,
} from '@/achievements/definitions';
import { GAME_THEME_IDS, type GameThemeId } from '@/game/themes/theme-ids';

export function getAvailableGameThemeIds(
  progress: AchievementProgress,
): GameThemeId[] {
  const unlockedRewards = new Set(getUnlockedThemeRewardIds(progress));

  return GAME_THEME_IDS.filter(
    (themeId) => themeId === 'neon' || unlockedRewards.has(themeId),
  );
}

export function getGameThemeUnlockAchievement(
  themeId: GameThemeId,
): AchievementDefinition | null {
  return (
    ACHIEVEMENTS.find(
      (achievement) => achievement.themeRewardId === themeId,
    ) ?? null
  );
}
