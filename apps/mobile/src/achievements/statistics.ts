import {
  AI_DIFFICULTY_LEVELS,
  type AiDifficultyLevel,
} from '@/game/ai/ai-difficulty';
import type { PlayerId, PointCompletedEvent } from '@/game/engine/types';
import type {
  GameMode,
  GameSessionDefinition,
} from '@/game/session/definition';

export type SoloDifficultyStatistics = {
  matchesPlayed: number;
  matchesWon: number;
  longestRally: number;
};

export type GameStatistics = {
  schemaVersion: 2;
  matchesPlayed: number;
  matchesWon: number;
  pointsScored: number;
  pointsConceded: number;
  ralliesPlayed: number;
  totalRallyHits: number;
  longestRally: number;
  flawlessWins: number;
  impossibleAiWins: number;
  onlineWins: number;
  reverseSweeps: number;
  soloByDifficulty: Record<AiDifficultyLevel, SoloDifficultyStatistics>;
};

export type MatchTrackingState = {
  reverseSweepEligible: Record<PlayerId, boolean>;
  completed: boolean;
};

export type StatisticsSessionContext = {
  mode: GameMode;
  localPlayerId: PlayerId | null;
  aiDifficultyLevel?: AiDifficultyLevel;
};

function createInitialSoloDifficultyStatistics(): SoloDifficultyStatistics {
  return {
    matchesPlayed: 0,
    matchesWon: 0,
    longestRally: 0,
  };
}

function createInitialSoloStatistics(): GameStatistics['soloByDifficulty'] {
  return {
    easy: createInitialSoloDifficultyStatistics(),
    medium: createInitialSoloDifficultyStatistics(),
    hard: createInitialSoloDifficultyStatistics(),
  };
}

export const INITIAL_GAME_STATISTICS: GameStatistics = {
  schemaVersion: 2,
  matchesPlayed: 0,
  matchesWon: 0,
  pointsScored: 0,
  pointsConceded: 0,
  ralliesPlayed: 0,
  totalRallyHits: 0,
  longestRally: 0,
  flawlessWins: 0,
  impossibleAiWins: 0,
  onlineWins: 0,
  reverseSweeps: 0,
  soloByDifficulty: createInitialSoloStatistics(),
};

const COUNTER_KEYS = [
  'matchesPlayed',
  'matchesWon',
  'pointsScored',
  'pointsConceded',
  'ralliesPlayed',
  'totalRallyHits',
  'longestRally',
  'flawlessWins',
  'impossibleAiWins',
  'onlineWins',
  'reverseSweeps',
] as const satisfies readonly (keyof GameStatistics)[];

export function createMatchTrackingState(): MatchTrackingState {
  return {
    reverseSweepEligible: { top: false, bottom: false },
    completed: false,
  };
}

export function createStatisticsSessionContext(
  session: GameSessionDefinition,
  aiDifficultyLevel?: AiDifficultyLevel,
): StatisticsSessionContext {
  return {
    mode: session.mode,
    localPlayerId: session.localPlayerId,
    aiDifficultyLevel,
  };
}

function opponentOf(player: PlayerId): PlayerId {
  return player === 'top' ? 'bottom' : 'top';
}

function trackedPlayerWon(winner: PlayerId, context: StatisticsSessionContext) {
  return context.localPlayerId === null || context.localPlayerId === winner;
}

export function recordCompletedPoint(
  statistics: GameStatistics,
  tracking: MatchTrackingState,
  event: PointCompletedEvent,
  context: StatisticsSessionContext,
): { statistics: GameStatistics; tracking: MatchTrackingState } {
  if (tracking.completed) {
    return { statistics, tracking };
  }

  const difficulty =
    context.mode === 'solo' ? context.aiDifficultyLevel : undefined;
  const nextStatistics: GameStatistics = {
    ...statistics,
    ralliesPlayed: statistics.ralliesPlayed + 1,
    totalRallyHits: statistics.totalRallyHits + event.rallyHitCount,
    longestRally: Math.max(statistics.longestRally, event.rallyHitCount),
    soloByDifficulty: {
      ...statistics.soloByDifficulty,
      ...(difficulty
        ? {
            [difficulty]: {
              ...statistics.soloByDifficulty[difficulty],
              longestRally: Math.max(
                statistics.soloByDifficulty[difficulty].longestRally,
                event.rallyHitCount,
              ),
            },
          }
        : {}),
    },
  };

  if (context.localPlayerId === event.scorer) {
    nextStatistics.pointsScored += 1;
  } else if (context.localPlayerId === event.concededBy) {
    nextStatistics.pointsConceded += 1;
  }

  const reverseSweepEligible = { ...tracking.reverseSweepEligible };

  for (const player of ['top', 'bottom'] as const) {
    if (
      event.match.score[player] === 0 &&
      event.match.score[opponentOf(player)] === event.match.winningScore - 1
    ) {
      reverseSweepEligible[player] = true;
    }
  }

  if (event.match.phase.type !== 'match-ended') {
    return {
      statistics: nextStatistics,
      tracking: { completed: false, reverseSweepEligible },
    };
  }

  const winner = event.match.phase.winner;
  const didTrackedPlayerWin = trackedPlayerWon(winner, context);
  nextStatistics.matchesPlayed += 1;

  if (difficulty) {
    const difficultyStatistics = nextStatistics.soloByDifficulty[difficulty];
    nextStatistics.soloByDifficulty = {
      ...nextStatistics.soloByDifficulty,
      [difficulty]: {
        ...difficultyStatistics,
        matchesPlayed: difficultyStatistics.matchesPlayed + 1,
        matchesWon:
          difficultyStatistics.matchesWon + (didTrackedPlayerWin ? 1 : 0),
      },
    };
  }

  if (didTrackedPlayerWin) {
    const opponent = opponentOf(winner);
    nextStatistics.matchesWon += 1;

    if (event.match.score[opponent] === 0) {
      nextStatistics.flawlessWins += 1;
    }

    if (reverseSweepEligible[winner]) {
      nextStatistics.reverseSweeps += 1;
    }

    if (context.mode === 'solo' && context.aiDifficultyLevel === 'hard') {
      nextStatistics.impossibleAiWins += 1;
    }

    if (context.mode === 'online-multiplayer') {
      nextStatistics.onlineWins += 1;
    }
  }

  return {
    statistics: nextStatistics,
    tracking: { completed: true, reverseSweepEligible },
  };
}

export function parseGameStatistics(value: unknown): GameStatistics {
  if (!value || typeof value !== 'object') {
    return INITIAL_GAME_STATISTICS;
  }

  const candidate = value as Partial<Record<keyof GameStatistics, unknown>>;
  const parsed: GameStatistics = {
    ...INITIAL_GAME_STATISTICS,
    soloByDifficulty: createInitialSoloStatistics(),
  };

  for (const key of COUNTER_KEYS) {
    const storedValue = candidate[key];
    if (
      typeof storedValue === 'number' &&
      Number.isFinite(storedValue) &&
      storedValue >= 0
    ) {
      parsed[key] = Math.floor(storedValue) as never;
    }
  }

  if (
    candidate.soloByDifficulty &&
    typeof candidate.soloByDifficulty === 'object'
  ) {
    const storedDifficulties = candidate.soloByDifficulty as Partial<
      Record<AiDifficultyLevel, unknown>
    >;

    for (const difficulty of AI_DIFFICULTY_LEVELS) {
      const storedDifficulty = storedDifficulties[difficulty];

      if (!storedDifficulty || typeof storedDifficulty !== 'object') {
        continue;
      }

      const counters = storedDifficulty as Partial<
        Record<keyof SoloDifficultyStatistics, unknown>
      >;
      const next = { ...parsed.soloByDifficulty[difficulty] };

      for (const key of [
        'matchesPlayed',
        'matchesWon',
        'longestRally',
      ] as const) {
        const storedValue = counters[key];

        if (
          typeof storedValue === 'number' &&
          Number.isFinite(storedValue) &&
          storedValue >= 0
        ) {
          next[key] = Math.floor(storedValue);
        }
      }

      parsed.soloByDifficulty[difficulty] = next;
    }
  }

  return parsed;
}
