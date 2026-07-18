import PonggersGameCenter, {
  type GameCenterAchievementProgress,
} from '@modules/game-center';
import { Platform } from 'react-native';

import {
  ACHIEVEMENTS,
  type AchievementId,
  type AchievementProgress,
} from '@/achievements/definitions';
import { GAME_CENTER_ENABLED } from '@/achievements/game-center-config';
import {
  getPendingAchievementProgress,
  markAchievementProgressReported,
  mergeReportedAchievementProgress,
} from '@/achievements/progress-storage';

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
  if (!PonggersGameCenter || !authenticated) {
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

async function synchronizeWithGameCenter() {
  if (!GAME_CENTER_ENABLED || Platform.OS !== 'ios' || !PonggersGameCenter) {
    return;
  }

  if (!authenticated) {
    const result = await PonggersGameCenter.authenticate();
    authenticated = result.authenticated;

    if (!authenticated) {
      return;
    }

    const remoteProgress = await PonggersGameCenter.loadAchievements();
    mergeReportedAchievementProgress(toKnownProgress(remoteProgress));
  }

  await flushPendingProgress();
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
  if (!GAME_CENTER_ENABLED) {
    return;
  }

  await requestGameCenterSynchronization();

  if (authenticated && PonggersGameCenter) {
    await PonggersGameCenter.showAchievements();
  }
}
