import { describe, expect, test } from 'bun:test';

import {
  ACHIEVEMENT_IDS,
  evaluateAchievementProgress,
} from '@/achievements/definitions';
import {
  createMatchTrackingState,
  type GameStatistics,
  INITIAL_GAME_STATISTICS,
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
});
