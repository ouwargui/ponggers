import { describe, expect, test } from 'bun:test';

import {
  MATCH_OPENING_COUNTDOWN_FROM,
  MATCH_OPENING_COUNTDOWN_STEP_TICKS,
  MATCH_POINT_COUNTDOWN_FROM,
  MATCH_POINT_COUNTDOWN_STEP_TICKS,
  MATCH_POINT_PAUSE_TICKS,
} from '@/game/constants';
import {
  advanceMatchPhase,
  createInitialMatchState,
  getCountdownValue,
  recordGoal,
} from '@/game/engine/match';
import type { GoalEvent, MatchState, PlayerId } from '@/game/engine/types';

function createPlayingMatch(winningScore = 5): MatchState {
  return {
    ...createInitialMatchState(),
    phase: { type: 'playing' },
    winningScore,
    rallyStartedAtTick: 0,
  };
}

function createGoal(
  scorer: PlayerId,
  concededBy: PlayerId,
  tick: number,
): GoalEvent {
  return {
    type: 'goal',
    ballId: 'primary-ball',
    scorer,
    concededBy,
    boundary: concededBy,
    tick,
  };
}

describe('match lifecycle', () => {
  test('starts with a countdown relative to the current simulation tick', () => {
    const startTick = 240;
    const match = createInitialMatchState(startTick, 'top');

    expect(match.phase).toEqual({
      type: 'countdown',
      startedAtTick: startTick,
      endsAtTick:
        startTick +
        MATCH_OPENING_COUNTDOWN_FROM * MATCH_OPENING_COUNTDOWN_STEP_TICKS,
      countFrom: MATCH_OPENING_COUNTDOWN_FROM,
      stepDurationTicks: MATCH_OPENING_COUNTDOWN_STEP_TICKS,
      serveToward: 'top',
    });
    expect(getCountdownValue(match, startTick)).toBe(3);
    expect(
      getCountdownValue(match, startTick + MATCH_OPENING_COUNTDOWN_STEP_TICKS),
    ).toBe(2);
  });

  test('moves from countdown to playing', () => {
    const match = createInitialMatchState(0);
    const countdownTicks =
      MATCH_OPENING_COUNTDOWN_FROM * MATCH_OPENING_COUNTDOWN_STEP_TICKS;
    const playing = advanceMatchPhase(match, countdownTicks);

    expect(playing.phase).toEqual({ type: 'playing' });
    expect(playing.rallyStartedAtTick).toBe(countdownTicks);
    expect(getCountdownValue(playing, countdownTicks)).toBeNull();
  });

  test('records a point, pauses, and serves toward the player who conceded', () => {
    const goalTick = 400;
    const pointScored = recordGoal(
      createPlayingMatch(),
      createGoal('top', 'bottom', goalTick),
    );

    expect(pointScored.score).toEqual({ top: 1, bottom: 0 });
    expect(pointScored.phase).toEqual({
      type: 'point-scored',
      scorer: 'top',
      concededBy: 'bottom',
      endsAtTick: goalTick + MATCH_POINT_PAUSE_TICKS,
    });

    const countdown = advanceMatchPhase(
      pointScored,
      goalTick + MATCH_POINT_PAUSE_TICKS,
    );

    expect(countdown.phase).toEqual({
      type: 'countdown',
      startedAtTick: goalTick + MATCH_POINT_PAUSE_TICKS,
      endsAtTick:
        goalTick +
        MATCH_POINT_PAUSE_TICKS +
        MATCH_POINT_COUNTDOWN_FROM * MATCH_POINT_COUNTDOWN_STEP_TICKS,
      countFrom: MATCH_POINT_COUNTDOWN_FROM,
      stepDurationTicks: MATCH_POINT_COUNTDOWN_STEP_TICKS,
      serveToward: 'bottom',
    });
  });

  test('ends the match when a player reaches the winning score', () => {
    const ended = recordGoal(
      createPlayingMatch(1),
      createGoal('bottom', 'top', 100),
    );

    expect(ended.score).toEqual({ top: 0, bottom: 1 });
    expect(ended.phase).toEqual({ type: 'match-ended', winner: 'bottom' });
    expect(advanceMatchPhase(ended, 1_000)).toBe(ended);
  });
});
