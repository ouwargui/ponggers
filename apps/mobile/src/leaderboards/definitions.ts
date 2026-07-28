import type { GameStatistics } from '@/achievements/statistics';
import {
  AI_DIFFICULTY_LEVELS,
  type AiDifficultyLevel,
} from '@/game/ai/ai-difficulty';

export const LEADERBOARD_IDS = {
  longestRally: {
    easy: 'com.ouwargui.ponggers.leaderboard.rally.easy',
    medium: 'com.ouwargui.ponggers.leaderboard.rally.medium',
    hard: 'com.ouwargui.ponggers.leaderboard.rally.impossible',
  },
  matchesWon: {
    easy: 'com.ouwargui.ponggers.leaderboard.wins.easy',
    medium: 'com.ouwargui.ponggers.leaderboard.wins.medium',
    hard: 'com.ouwargui.ponggers.leaderboard.wins.impossible',
  },
  matchesPlayed: {
    easy: 'com.ouwargui.ponggers.leaderboard.matches.easy',
    medium: 'com.ouwargui.ponggers.leaderboard.matches.medium',
    hard: 'com.ouwargui.ponggers.leaderboard.matches.impossible',
  },
} as const;

export type LeaderboardMetric = keyof typeof LEADERBOARD_IDS;

export type LeaderboardId =
  (typeof LEADERBOARD_IDS)[LeaderboardMetric][AiDifficultyLevel];

export type LeaderboardScores = Partial<Record<LeaderboardId, number>>;

export type LeaderboardSubmission = {
  identifier: LeaderboardId;
  value: number;
};

export const LEADERBOARD_DEFINITIONS = AI_DIFFICULTY_LEVELS.flatMap(
  (difficulty) =>
    (
      [
        ['longestRally', 'LONGEST RALLY', 'hits'],
        ['matchesWon', 'MOST WINS', 'wins'],
        ['matchesPlayed', 'MATCHES PLAYED', 'matches'],
      ] as const
    ).map(([metric, name, unit]) => ({
      difficulty,
      identifier: LEADERBOARD_IDS[metric][difficulty],
      metric,
      name,
      unit,
    })),
);

export const LEADERBOARD_ID_SET = new Set<LeaderboardId>(
  LEADERBOARD_DEFINITIONS.map(({ identifier }) => identifier),
);

export function getLeaderboardScores(
  statistics: GameStatistics,
): Record<LeaderboardId, number> {
  return Object.fromEntries(
    LEADERBOARD_DEFINITIONS.map(({ difficulty, identifier, metric }) => [
      identifier,
      statistics.soloByDifficulty[difficulty][metric],
    ]),
  ) as Record<LeaderboardId, number>;
}

export function getPendingLeaderboardSubmissions(
  statistics: GameStatistics,
  reportedScores: LeaderboardScores,
): LeaderboardSubmission[] {
  const desiredScores = getLeaderboardScores(statistics);

  return LEADERBOARD_DEFINITIONS.flatMap(({ identifier }) => {
    const desired = desiredScores[identifier];
    const reported = reportedScores[identifier] ?? 0;

    return desired > 0 && desired > reported
      ? [{ identifier, value: desired }]
      : [];
  });
}

export function mergeReportedLeaderboardScores(
  current: LeaderboardScores,
  submissions: readonly LeaderboardSubmission[],
): LeaderboardScores {
  const next = { ...current };

  for (const { identifier, value } of submissions) {
    next[identifier] = Math.max(next[identifier] ?? 0, value);
  }

  return next;
}
