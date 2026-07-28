import PonggersGameCenter, {
  type GameCenterAchievementProgress,
} from '@modules/game-center';
import { Platform } from 'react-native';

import {
  ACHIEVEMENTS,
  type AchievementId,
  type AchievementProgress,
} from '@/achievements/definitions';
import {
  getPendingAchievementProgress,
  getPendingLeaderboardScores,
  markAchievementProgressReported,
  markLeaderboardScoresReported,
  mergeReportedAchievementProgress,
} from '@/achievements/progress-storage';
import {
  GAME_CENTER_ACHIEVEMENTS_ENABLED,
  GAME_CENTER_LEADERBOARDS_ENABLED,
} from '@/game-center/game-center-config';

const achievementIds = new Set<AchievementId>(ACHIEVEMENTS.map(({ id }) => id));

let authenticated = false;
let synchronization: Promise<void> | null = null;

function toKnownProgress(
  achievements: readonly GameCenterAchievementProgress[],
): AchievementProgress {
  const progress: AchievementProgress = {};

  for (const achievement of achievements) {
    if (achievementIds.has(achievement.identifier as AchievementId)) {
      progress[achievement.identifier as AchievementId] =
        achievement.percentComplete;
    }
  }

  return progress;
}

async function flushPendingProgress() {
  if (
    !GAME_CENTER_ACHIEVEMENTS_ENABLED ||
    !PonggersGameCenter ||
    !authenticated
  ) {
    return;
  }

  while (true) {
    const pending = getPendingAchievementProgress();

    if (pending.length === 0) {
      return;
    }

    await PonggersGameCenter.reportAchievements(pending);
    markAchievementProgressReported(pending);
  }
}

async function flushPendingLeaderboardScores() {
  if (
    !GAME_CENTER_LEADERBOARDS_ENABLED ||
    !PonggersGameCenter ||
    !authenticated
  ) {
    return;
  }

  while (true) {
    const pending = getPendingLeaderboardScores();

    if (pending.length === 0) {
      return;
    }

    await PonggersGameCenter.reportLeaderboardScores(pending);
    markLeaderboardScoresReported(pending);
  }
}

async function synchronizeWithGameCenter() {
  if (
    (!GAME_CENTER_ACHIEVEMENTS_ENABLED && !GAME_CENTER_LEADERBOARDS_ENABLED) ||
    Platform.OS !== 'ios' ||
    !PonggersGameCenter
  ) {
    return;
  }

  if (!authenticated) {
    const result = await PonggersGameCenter.authenticate();
    authenticated = result.authenticated;

    if (!authenticated) {
      return;
    }

    if (GAME_CENTER_ACHIEVEMENTS_ENABLED) {
      const remoteProgress = await PonggersGameCenter.loadAchievements();
      mergeReportedAchievementProgress(toKnownProgress(remoteProgress));
    }
  }

  await flushPendingProgress();
  await flushPendingLeaderboardScores();
}

export function requestGameCenterSynchronization(): Promise<void> {
  if (synchronization) {
    return synchronization;
  }

  synchronization = synchronizeWithGameCenter().finally(() => {
    synchronization = null;
  });

  return synchronization;
}

export async function showGameCenterAchievements() {
  if (!GAME_CENTER_ACHIEVEMENTS_ENABLED) {
    return false;
  }

  await requestGameCenterSynchronization();

  if (authenticated && PonggersGameCenter) {
    await PonggersGameCenter.showAchievements();
    return true;
  }

  return false;
}

export async function showGameCenterLeaderboards() {
  if (!GAME_CENTER_LEADERBOARDS_ENABLED) {
    return false;
  }

  try {
    await requestGameCenterSynchronization();
  } catch (error) {
    if (!authenticated) {
      throw error;
    }

    if (__DEV__) {
      console.warn('[Game Center] Leaderboard synchronization failed', error);
    }
  }

  if (authenticated && PonggersGameCenter) {
    await PonggersGameCenter.showLeaderboards();
    return true;
  }

  return false;
}
