import {
  MATCH_OPENING_COUNTDOWN_FROM,
  MATCH_OPENING_COUNTDOWN_STEP_TICKS,
  MATCH_POINT_COUNTDOWN_FROM,
  MATCH_POINT_COUNTDOWN_STEP_TICKS,
  MATCH_POINT_PAUSE_TICKS,
  MATCH_WINNING_SCORE,
} from '@/game/constants';
import type {
  GoalEvent,
  MatchPhase,
  MatchState,
  PlayerId,
} from '@/game/engine/types';

type CountdownKind = 'opening' | 'between-points';

function createCountdownPhase(
  startTick: number,
  serveToward: PlayerId,
  kind: CountdownKind,
): Extract<MatchPhase, { type: 'countdown' }> {
  'worklet';

  const countFrom =
    kind === 'opening'
      ? MATCH_OPENING_COUNTDOWN_FROM
      : MATCH_POINT_COUNTDOWN_FROM;
  const stepDurationTicks =
    kind === 'opening'
      ? MATCH_OPENING_COUNTDOWN_STEP_TICKS
      : MATCH_POINT_COUNTDOWN_STEP_TICKS;

  return {
    type: 'countdown',
    startedAtTick: startTick,
    endsAtTick: startTick + countFrom * stepDurationTicks,
    countFrom,
    stepDurationTicks,
    serveToward,
  };
}

export function createInitialMatchState(
  startTick = 0,
  serveToward: PlayerId = 'bottom',
): MatchState {
  'worklet';

  return {
    phase: createCountdownPhase(startTick, serveToward, 'opening'),
    score: { top: 0, bottom: 0 },
    winningScore: MATCH_WINNING_SCORE,
    rallyStartedAtTick: null,
  };
}

export function getCountdownValue(
  match: MatchState,
  tick: number,
): number | null {
  'worklet';

  if (match.phase.type !== 'countdown') {
    return null;
  }

  const elapsedTicks = Math.max(tick - match.phase.startedAtTick, 0);
  const elapsedSteps = Math.floor(elapsedTicks / match.phase.stepDurationTicks);

  return Math.max(match.phase.countFrom - elapsedSteps, 1);
}

export function advanceMatchPhase(match: MatchState, tick: number): MatchState {
  'worklet';

  if (match.phase.type === 'point-scored' && tick >= match.phase.endsAtTick) {
    return {
      ...match,
      phase: createCountdownPhase(
        tick,
        match.phase.concededBy,
        'between-points',
      ),
    };
  }

  if (match.phase.type === 'countdown' && tick >= match.phase.endsAtTick) {
    return {
      ...match,
      phase: { type: 'playing' },
      rallyStartedAtTick: tick,
    };
  }

  return match;
}

export function recordGoal(match: MatchState, goal: GoalEvent): MatchState {
  'worklet';

  if (match.phase.type !== 'playing') {
    return match;
  }

  const score = {
    ...match.score,
    [goal.scorer]: match.score[goal.scorer] + 1,
  };

  if (score[goal.scorer] >= match.winningScore) {
    return {
      ...match,
      score,
      phase: { type: 'match-ended', winner: goal.scorer },
      rallyStartedAtTick: null,
    };
  }

  return {
    ...match,
    score,
    phase: {
      type: 'point-scored',
      scorer: goal.scorer,
      concededBy: goal.concededBy,
      endsAtTick: goal.tick + MATCH_POINT_PAUSE_TICKS,
    },
    rallyStartedAtTick: null,
  };
}
