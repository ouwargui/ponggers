import {
  MATCH_COUNTDOWN_TICKS,
  MATCH_POINT_PAUSE_TICKS,
  MATCH_WINNING_SCORE,
} from '@/game/constants';
import type { GoalEvent, MatchState } from '@/game/engine/types';

export function createInitialMatchState(startTick = 0): MatchState {
  'worklet';

  return {
    phase: {
      type: 'countdown',
      endsAtTick: startTick + MATCH_COUNTDOWN_TICKS,
      serveToward: 'bottom',
    },
    score: { top: 0, bottom: 0 },
    winningScore: MATCH_WINNING_SCORE,
    rallyStartedAtTick: null,
  };
}

export function advanceMatchPhase(match: MatchState, tick: number): MatchState {
  'worklet';

  if (match.phase.type === 'point-scored' && tick >= match.phase.endsAtTick) {
    return {
      ...match,
      phase: {
        type: 'countdown',
        endsAtTick: tick + MATCH_COUNTDOWN_TICKS,
        serveToward: match.phase.concededBy,
      },
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
