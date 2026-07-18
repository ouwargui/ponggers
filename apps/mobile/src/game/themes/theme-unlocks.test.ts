import { describe, expect, test } from 'bun:test';

import { ACHIEVEMENT_IDS } from '@/achievements/definitions';
import {
  getAvailableGameThemeIds,
  getGameThemeUnlockAchievement,
} from '@/game/themes/theme-unlocks';

describe('game theme unlocks', () => {
  test('keeps Neon available before any achievement is complete', () => {
    expect(getAvailableGameThemeIds({})).toEqual(['neon']);
    expect(getAvailableGameThemeIds({ [ACHIEVEMENT_IDS.spark]: 99 })).toEqual([
      'neon',
    ]);
  });

  test('unlocks the implemented Volt theme with Spark', () => {
    expect(getAvailableGameThemeIds({ [ACHIEVEMENT_IDS.spark]: 100 })).toEqual([
      'neon',
      'volt',
    ]);
  });

  test('describes the achievement required to unlock Volt', () => {
    expect(getGameThemeUnlockAchievement('neon')).toBeNull();
    expect(getGameThemeUnlockAchievement('volt')?.id).toBe(
      ACHIEVEMENT_IDS.spark,
    );
  });

  test('unlocks Prism with a flawless win', () => {
    expect(
      getAvailableGameThemeIds({
        [ACHIEVEMENT_IDS.flawless]: 100,
      }),
    ).toEqual(['neon', 'prism']);
    expect(getGameThemeUnlockAchievement('prism')?.id).toBe(
      ACHIEVEMENT_IDS.flawless,
    );
  });
});
