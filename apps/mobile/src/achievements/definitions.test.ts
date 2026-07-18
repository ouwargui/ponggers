import { describe, expect, test } from 'bun:test';
import type { AchievementProgress } from '@/achievements/definitions';
import {
  ACHIEVEMENTS,
  getUnlockedThemeRewardIds,
  orderAchievementsByProgress,
} from '@/achievements/definitions';

describe('achievement definitions', () => {
  test('gives every achievement a distinct future theme reward', () => {
    const themeRewardIds = ACHIEVEMENTS.map(
      (achievement) => achievement.themeRewardId,
    );

    expect(new Set(themeRewardIds).size).toBe(ACHIEVEMENTS.length);
    expect(themeRewardIds).not.toContain('neon');
  });

  test('unlocks theme rewards only when their achievement is complete', () => {
    const [first, second] = ACHIEVEMENTS;
    const progress: AchievementProgress = {
      [first.id]: 100,
      [second.id]: 99,
    };

    expect(getUnlockedThemeRewardIds(progress)).toEqual([first.themeRewardId]);
  });

  test('keeps the initial achievement set within the Game Center point limit', () => {
    const totalPoints = ACHIEVEMENTS.reduce(
      (total, achievement) => total + achievement.points,
      0,
    );

    expect(totalPoints).toBe(190);
  });

  test('orders completed achievements first, then closest progress', () => {
    const [first, second, third, fourth] = ACHIEVEMENTS;
    const ordered = orderAchievementsByProgress({
      [first.id]: 45,
      [second.id]: 100,
      [third.id]: 78,
      [fourth.id]: 100,
    });

    expect(ordered.slice(0, 4).map(({ id }) => id)).toEqual([
      second.id,
      fourth.id,
      third.id,
      first.id,
    ]);
  });

  test('preserves catalog order when progress is tied', () => {
    const progress = Object.fromEntries(ACHIEVEMENTS.map(({ id }) => [id, 25]));

    expect(orderAchievementsByProgress(progress)).toEqual([...ACHIEVEMENTS]);
  });
});
