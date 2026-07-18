import type { GameStatistics } from '@/achievements/statistics';
import type { ThemeRewardId } from '@/game/themes/theme-rewards';

export const ACHIEVEMENT_IDS = {
  spark: 'com.ouwargui.ponggers.achievement.spark',
  lockedIn: 'com.ouwargui.ponggers.achievement.lockedin',
  overdrive: 'com.ouwargui.ponggers.achievement.overdrive',
  endless: 'com.ouwargui.ponggers.achievement.endless',
  flawless: 'com.ouwargui.ponggers.achievement.flawless',
  machineBreaker: 'com.ouwargui.ponggers.achievement.machinebreaker',
  connected: 'com.ouwargui.ponggers.achievement.connected',
  reverseSweep: 'com.ouwargui.ponggers.achievement.reversesweep',
} as const;

export type AchievementId =
  (typeof ACHIEVEMENT_IDS)[keyof typeof ACHIEVEMENT_IDS];

export type AchievementProgress = Partial<Record<AchievementId, number>>;

export type AchievementDefinition = {
  description: string;
  glyph: string;
  id: AchievementId;
  points: number;
  progress: {
    current: (statistics: GameStatistics) => number;
    target: number;
  };
  themeRewardId: ThemeRewardId;
  title: string;
};

function percentage(value: number, target: number) {
  return Math.min(100, Math.max(0, Math.floor((value / target) * 100)));
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    title: 'SPARK',
    description: 'Win your first match.',
    glyph: '✦',
    id: ACHIEVEMENT_IDS.spark,
    points: 10,
    progress: {
      current: (statistics) => statistics.matchesWon,
      target: 1,
    },
    themeRewardId: 'volt',
  },
  {
    title: 'LOCKED IN',
    description: 'Reach 10 hits in a single rally.',
    glyph: '⌁',
    id: ACHIEVEMENT_IDS.lockedIn,
    points: 10,
    progress: {
      current: (statistics) => statistics.longestRally,
      target: 10,
    },
    themeRewardId: 'grid',
  },
  {
    title: 'OVERDRIVE',
    description: 'Reach 20 hits in a single rally.',
    glyph: '»',
    id: ACHIEVEMENT_IDS.overdrive,
    points: 20,
    progress: {
      current: (statistics) => statistics.longestRally,
      target: 20,
    },
    themeRewardId: 'hyper',
  },
  {
    title: 'ENDLESS',
    description: 'Reach 30 hits in a single rally.',
    glyph: '∞',
    id: ACHIEVEMENT_IDS.endless,
    points: 30,
    progress: {
      current: (statistics) => statistics.longestRally,
      target: 30,
    },
    themeRewardId: 'void',
  },
  {
    title: 'FLAWLESS',
    description: 'Win a match without conceding a point.',
    glyph: '◇',
    id: ACHIEVEMENT_IDS.flawless,
    points: 25,
    progress: {
      current: (statistics) => statistics.flawlessWins,
      target: 1,
    },
    themeRewardId: 'prism',
  },
  {
    title: 'MACHINE BREAKER',
    description: 'Defeat the Impossible AI.',
    glyph: '◆',
    id: ACHIEVEMENT_IDS.machineBreaker,
    points: 40,
    progress: {
      current: (statistics) => statistics.impossibleAiWins,
      target: 1,
    },
    themeRewardId: 'synth',
  },
  {
    title: 'CONNECTED',
    description: 'Win an online match.',
    glyph: '◎',
    id: ACHIEVEMENT_IDS.connected,
    points: 20,
    progress: {
      current: (statistics) => statistics.onlineWins,
      target: 1,
    },
    themeRewardId: 'link',
  },
  {
    title: 'REVERSE SWEEP',
    description: 'Win after trailing zero to match point.',
    glyph: '↺',
    id: ACHIEVEMENT_IDS.reverseSweep,
    points: 35,
    progress: {
      current: (statistics) => statistics.reverseSweeps,
      target: 1,
    },
    themeRewardId: 'eclipse',
  },
] as const;

export function evaluateAchievementProgress(
  statistics: GameStatistics,
): AchievementProgress {
  return Object.fromEntries(
    ACHIEVEMENTS.map((achievement) => [
      achievement.id,
      percentage(
        achievement.progress.current(statistics),
        achievement.progress.target,
      ),
    ]),
  );
}

export function getUnlockedThemeRewardIds(
  progress: AchievementProgress,
): ThemeRewardId[] {
  return ACHIEVEMENTS.filter(
    (achievement) => (progress[achievement.id] ?? 0) >= 100,
  ).map((achievement) => achievement.themeRewardId);
}

export function orderAchievementsByProgress(
  progress: AchievementProgress,
): AchievementDefinition[] {
  return ACHIEVEMENTS.map((achievement, catalogIndex) => ({
    achievement,
    catalogIndex,
    percentComplete: progress[achievement.id] ?? 0,
  }))
    .sort((left, right) => {
      const leftCompleted = left.percentComplete >= 100;
      const rightCompleted = right.percentComplete >= 100;

      if (leftCompleted !== rightCompleted) {
        return rightCompleted ? 1 : -1;
      }

      return (
        right.percentComplete - left.percentComplete ||
        left.catalogIndex - right.catalogIndex
      );
    })
    .map(({ achievement }) => achievement);
}

export function mergeAchievementProgress(
  current: AchievementProgress,
  incoming: AchievementProgress,
): AchievementProgress {
  const next = { ...current };

  for (const achievement of ACHIEVEMENTS) {
    next[achievement.id] = Math.max(
      current[achievement.id] ?? 0,
      incoming[achievement.id] ?? 0,
    );
  }

  return next;
}
