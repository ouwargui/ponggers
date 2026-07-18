import { createMMKV } from 'react-native-mmkv';

import {
  ACHIEVEMENTS,
  type AchievementId,
  type AchievementProgress,
  evaluateAchievementProgress,
  mergeAchievementProgress,
} from '@/achievements/definitions';
import {
  type GameStatistics,
  INITIAL_GAME_STATISTICS,
  type MatchTrackingState,
  parseGameStatistics,
  recordCompletedPoint,
  type StatisticsSessionContext,
} from '@/achievements/statistics';
import type { PointCompletedEvent } from '@/game/engine/types';

type StoredProgress = {
  schemaVersion: 1;
  statistics: GameStatistics;
  achievementProgress: AchievementProgress;
  reportedAchievementProgress: AchievementProgress;
};

export type AchievementProgressSnapshot = {
  achievementProgress: AchievementProgress;
  statistics: GameStatistics;
};

export type PendingAchievementProgress = {
  identifier: AchievementId;
  percentComplete: number;
};

const STORAGE_KEY = 'game-progress-v1';
const progressStorage = createMMKV({ id: 'ponggers-progress' });
const progressListeners = new Set<() => void>();

function createInitialProgress(): StoredProgress {
  return {
    schemaVersion: 1,
    statistics: INITIAL_GAME_STATISTICS,
    achievementProgress: evaluateAchievementProgress(INITIAL_GAME_STATISTICS),
    reportedAchievementProgress: {},
  };
}

function parseAchievementProgress(value: unknown): AchievementProgress {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const progress: AchievementProgress = {};

  for (const achievement of ACHIEVEMENTS) {
    const percent = candidate[achievement.id];

    if (typeof percent === 'number' && Number.isFinite(percent)) {
      progress[achievement.id] = Math.min(
        100,
        Math.max(0, Math.floor(percent)),
      );
    }
  }

  return progress;
}

function readProgress(): StoredProgress {
  const stored = progressStorage.getString(STORAGE_KEY);

  if (!stored) {
    return createInitialProgress();
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredProgress>;
    const statistics = parseGameStatistics(parsed.statistics);

    return {
      schemaVersion: 1,
      statistics,
      achievementProgress: mergeAchievementProgress(
        evaluateAchievementProgress(statistics),
        parseAchievementProgress(parsed.achievementProgress),
      ),
      reportedAchievementProgress: parseAchievementProgress(
        parsed.reportedAchievementProgress,
      ),
    };
  } catch {
    return createInitialProgress();
  }
}

function persistProgress(progress: StoredProgress) {
  progressStorage.set(STORAGE_KEY, JSON.stringify(progress));
}

function hasAdvanced(current: AchievementProgress, next: AchievementProgress) {
  return ACHIEVEMENTS.some(({ id }) => (next[id] ?? 0) > (current[id] ?? 0));
}

function notifyProgressListeners() {
  for (const listener of progressListeners) {
    listener();
  }
}

export function recordPointProgress(
  event: PointCompletedEvent,
  context: StatisticsSessionContext,
  tracking: MatchTrackingState,
): MatchTrackingState {
  const current = readProgress();
  const result = recordCompletedPoint(
    current.statistics,
    tracking,
    event,
    context,
  );
  const achievementProgress = mergeAchievementProgress(
    current.achievementProgress,
    evaluateAchievementProgress(result.statistics),
  );

  persistProgress({
    ...current,
    statistics: result.statistics,
    achievementProgress,
  });

  if (hasAdvanced(current.achievementProgress, achievementProgress)) {
    notifyProgressListeners();
  }

  return result.tracking;
}

export function getPendingAchievementProgress(): PendingAchievementProgress[] {
  const progress = readProgress();

  return ACHIEVEMENTS.flatMap(({ id }) => {
    const desired = progress.achievementProgress[id] ?? 0;
    const reported = progress.reportedAchievementProgress[id] ?? 0;

    return desired > reported
      ? [{ identifier: id, percentComplete: desired }]
      : [];
  });
}

export function mergeReportedAchievementProgress(
  reported: AchievementProgress,
) {
  const current = readProgress();
  const reportedAchievementProgress = mergeAchievementProgress(
    current.reportedAchievementProgress,
    reported,
  );
  const achievementProgress = mergeAchievementProgress(
    current.achievementProgress,
    reportedAchievementProgress,
  );

  persistProgress({
    ...current,
    achievementProgress,
    reportedAchievementProgress,
  });

  if (hasAdvanced(current.achievementProgress, achievementProgress)) {
    notifyProgressListeners();
  }
}

export function markAchievementProgressReported(
  reported: readonly PendingAchievementProgress[],
) {
  const current = readProgress();
  const incoming = Object.fromEntries(
    reported.map(({ identifier, percentComplete }) => [
      identifier,
      percentComplete,
    ]),
  ) as AchievementProgress;

  persistProgress({
    ...current,
    reportedAchievementProgress: mergeAchievementProgress(
      current.reportedAchievementProgress,
      incoming,
    ),
  });
}

export function subscribeToAchievementProgress(listener: () => void) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

export function getAchievementProgressSnapshot(): AchievementProgressSnapshot {
  const progress = readProgress();

  return {
    achievementProgress: progress.achievementProgress,
    statistics: progress.statistics,
  };
}
