import { describe, expect, test } from 'bun:test';

import {
  ACHIEVEMENT_IDS,
  evaluateAchievementProgress,
} from '@/achievements/definitions';
import {
  createMatchTrackingState,
  type GameStatistics,
  INITIAL_GAME_STATISTICS,
  parseGameStatistics,
  recordCompletedPoint,
  type StatisticsSessionContext,
} from '@/achievements/statistics';
import type {
  MatchState,
  PlayerId,
  PointCompletedEvent,
} from '@/game/engine/types';

const SOLO_CONTEXT: StatisticsSessionContext = {
  mode: 'solo',
  localPlayerId: 'bottom',
  aiDifficultyLevel: 'medium',
};

function point(
  top: number,
  bottom: number,
  scorer: PlayerId,
  rallyHitCount = 0,
): PointCompletedEvent {
  const winner = top === 5 ? 'top' : bottom === 5 ? 'bottom' : null;
  const match: MatchState = {
    score: { top, bottom },
    winningScore: 5,
    rallyStartedAtTick: null,
    phase: winner
      ? { type: 'match-ended', winner }
      : {
          type: 'point-scored',
          scorer,
          concededBy: scorer === 'top' ? 'bottom' : 'top',
          endsAtTick: 1,
        },
  };

  return {
    type: 'point-completed',
    scorer,
    concededBy: scorer === 'top' ? 'bottom' : 'top',
    rallyHitCount,
    match,
  };
}

function playPoints(events: PointCompletedEvent[], context = SOLO_CONTEXT) {
  let statistics: GameStatistics = INITIAL_GAME_STATISTICS;
  let tracking = createMatchTrackingState();

  for (const event of events) {
    const result = recordCompletedPoint(statistics, tracking, event, context);
    statistics = result.statistics;
    tracking = result.tracking;
  }

  return { statistics, tracking };
}

describe('game statistics', () => {
  test('records rally totals and progressive rally achievements', () => {
    const { statistics } = playPoints([point(0, 1, 'bottom', 12)]);
    const progress = evaluateAchievementProgress(statistics);

    expect(statistics.ralliesPlayed).toBe(1);
    expect(statistics.totalRallyHits).toBe(12);
    expect(statistics.longestRally).toBe(12);
    expect(progress[ACHIEVEMENT_IDS.lockedIn]).toBe(100);
    expect(progress[ACHIEVEMENT_IDS.overdrive]).toBe(60);
    expect(progress[ACHIEVEMENT_IDS.endless]).toBe(40);
  });

  test('unlocks a reverse sweep after recovering from zero to match point', () => {
    const events = [
      point(1, 0, 'top'),
      point(2, 0, 'top'),
      point(3, 0, 'top'),
      point(4, 0, 'top'),
      point(4, 1, 'bottom'),
      point(4, 2, 'bottom'),
      point(4, 3, 'bottom'),
      point(4, 4, 'bottom'),
      point(4, 5, 'bottom'),
    ];
    const { statistics } = playPoints(events);

    expect(statistics.reverseSweeps).toBe(1);
    expect(evaluateAchievementProgress(statistics)).toMatchObject({
      [ACHIEVEMENT_IDS.reverseSweep]: 100,
    });
  });

  test('does not count a comeback when the winner had already scored', () => {
    const events = [
      point(0, 1, 'bottom'),
      point(1, 1, 'top'),
      point(2, 1, 'top'),
      point(3, 1, 'top'),
      point(4, 1, 'top'),
      point(4, 2, 'bottom'),
      point(4, 3, 'bottom'),
      point(4, 4, 'bottom'),
      point(4, 5, 'bottom'),
    ];

    expect(playPoints(events).statistics.reverseSweeps).toBe(0);
  });

  test('records a flawless win and ignores duplicate completion events', () => {
    const finalPoint = point(0, 5, 'bottom');
    const result = playPoints([
      point(0, 1, 'bottom'),
      point(0, 2, 'bottom'),
      point(0, 3, 'bottom'),
      point(0, 4, 'bottom'),
      finalPoint,
      finalPoint,
    ]);

    expect(result.statistics.matchesPlayed).toBe(1);
    expect(result.statistics.matchesWon).toBe(1);
    expect(result.statistics.flawlessWins).toBe(1);
    expect(result.statistics.ralliesPlayed).toBe(5);
  });

  test('records Impossible AI and online wins only in their modes', () => {
    const winningPoints = [
      point(0, 1, 'bottom'),
      point(0, 2, 'bottom'),
      point(0, 3, 'bottom'),
      point(0, 4, 'bottom'),
      point(0, 5, 'bottom'),
    ];
    const impossible = playPoints(winningPoints, {
      ...SOLO_CONTEXT,
      aiDifficultyLevel: 'hard',
    }).statistics;
    const online = playPoints(winningPoints, {
      mode: 'online-multiplayer',
      localPlayerId: 'bottom',
    }).statistics;

    expect(impossible.impossibleAiWins).toBe(1);
    expect(impossible.onlineWins).toBe(0);
    expect(online.impossibleAiWins).toBe(0);
    expect(online.onlineWins).toBe(1);
  });

  test('tracks solo leaderboard statistics independently by difficulty', () => {
    const easyWin = playPoints(
      [
        point(0, 1, 'bottom', 4),
        point(0, 2, 'bottom', 7),
        point(0, 3, 'bottom', 3),
        point(0, 4, 'bottom', 2),
        point(0, 5, 'bottom', 5),
      ],
      { ...SOLO_CONTEXT, aiDifficultyLevel: 'easy' },
    ).statistics;
    const mediumLoss = playPoints(
      [
        point(1, 0, 'top', 8),
        point(2, 0, 'top', 12),
        point(3, 0, 'top', 6),
        point(4, 0, 'top', 4),
        point(5, 0, 'top', 3),
      ],
      { ...SOLO_CONTEXT, aiDifficultyLevel: 'medium' },
    ).statistics;

    expect(easyWin.soloByDifficulty.easy).toEqual({
      matchesPlayed: 1,
      matchesWon: 1,
      longestRally: 7,
    });
    expect(easyWin.soloByDifficulty.medium).toEqual({
      matchesPlayed: 0,
      matchesWon: 0,
      longestRally: 0,
    });
    expect(mediumLoss.soloByDifficulty.medium).toEqual({
      matchesPlayed: 1,
      matchesWon: 0,
      longestRally: 12,
    });
  });

  test('migrates legacy statistics without inventing difficulty totals', () => {
    const parsed = parseGameStatistics({
      schemaVersion: 1,
      matchesPlayed: 9,
      matchesWon: 4,
      longestRally: 18,
    });

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.matchesPlayed).toBe(9);
    expect(parsed.matchesWon).toBe(4);
    expect(parsed.longestRally).toBe(18);
    expect(parsed.soloByDifficulty).toEqual({
      easy: { matchesPlayed: 0, matchesWon: 0, longestRally: 0 },
      medium: { matchesPlayed: 0, matchesWon: 0, longestRally: 0 },
      hard: { matchesPlayed: 0, matchesWon: 0, longestRally: 0 },
    });
  });

  test('sanitizes persisted per-difficulty statistics', () => {
    const parsed = parseGameStatistics({
      schemaVersion: 2,
      soloByDifficulty: {
        easy: {
          matchesPlayed: 3.8,
          matchesWon: -1,
          longestRally: 14.9,
        },
      },
    });

    expect(parsed.soloByDifficulty.easy).toEqual({
      matchesPlayed: 3,
      matchesWon: 0,
      longestRally: 14,
    });
  });
});
