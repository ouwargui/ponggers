import { describe, expect, test } from 'bun:test';
import { INITIAL_GAME_STATISTICS } from '@/achievements/statistics';
import {
  getLeaderboardScores,
  getPendingLeaderboardSubmissions,
  LEADERBOARD_DEFINITIONS,
  LEADERBOARD_IDS,
  mergeReportedLeaderboardScores,
} from '@/leaderboards/definitions';

describe('leaderboard definitions', () => {
  test('defines three unique metrics for every difficulty', () => {
    expect(LEADERBOARD_DEFINITIONS).toHaveLength(9);
    expect(
      new Set(LEADERBOARD_DEFINITIONS.map(({ identifier }) => identifier)).size,
    ).toBe(9);
  });

  test('uses the public Impossible label in hard leaderboard identifiers', () => {
    expect(LEADERBOARD_IDS.longestRally.hard).toEndWith('.impossible');
    expect(LEADERBOARD_IDS.matchesWon.hard).toEndWith('.impossible');
    expect(LEADERBOARD_IDS.matchesPlayed.hard).toEndWith('.impossible');
  });

  test('maps local per-difficulty statistics to Game Center scores', () => {
    const statistics = {
      ...INITIAL_GAME_STATISTICS,
      soloByDifficulty: {
        ...INITIAL_GAME_STATISTICS.soloByDifficulty,
        hard: {
          matchesPlayed: 11,
          matchesWon: 4,
          longestRally: 23,
        },
      },
    };

    expect(getLeaderboardScores(statistics)).toMatchObject({
      [LEADERBOARD_IDS.longestRally.hard]: 23,
      [LEADERBOARD_IDS.matchesWon.hard]: 4,
      [LEADERBOARD_IDS.matchesPlayed.hard]: 11,
    });
  });

  test('submits only positive scores that advanced beyond local receipts', () => {
    const statistics = {
      ...INITIAL_GAME_STATISTICS,
      soloByDifficulty: {
        ...INITIAL_GAME_STATISTICS.soloByDifficulty,
        easy: {
          matchesPlayed: 3,
          matchesWon: 2,
          longestRally: 9,
        },
      },
    };
    const pending = getPendingLeaderboardSubmissions(statistics, {
      [LEADERBOARD_IDS.longestRally.easy]: 9,
      [LEADERBOARD_IDS.matchesWon.easy]: 1,
    });

    expect(pending).toContainEqual({
      identifier: LEADERBOARD_IDS.matchesWon.easy,
      value: 2,
    });
    expect(pending).toContainEqual({
      identifier: LEADERBOARD_IDS.matchesPlayed.easy,
      value: 3,
    });
    expect(pending).not.toContainEqual({
      identifier: LEADERBOARD_IDS.longestRally.easy,
      value: 9,
    });
    expect(pending).toHaveLength(2);
  });

  test('never regresses a locally acknowledged score', () => {
    const merged = mergeReportedLeaderboardScores(
      { [LEADERBOARD_IDS.matchesWon.hard]: 7 },
      [
        { identifier: LEADERBOARD_IDS.matchesWon.hard, value: 5 },
        { identifier: LEADERBOARD_IDS.longestRally.hard, value: 20 },
      ],
    );

    expect(merged).toMatchObject({
      [LEADERBOARD_IDS.matchesWon.hard]: 7,
      [LEADERBOARD_IDS.longestRally.hard]: 20,
    });
  });
});
