import { type PropsWithChildren, useEffect } from 'react';
import { AppState } from 'react-native';

import {
  subscribeToAchievementProgress,
  subscribeToLeaderboardScores,
} from '@/achievements/progress-storage';
import { requestGameCenterSynchronization } from '@/game-center/game-center-client';

function synchronize() {
  void requestGameCenterSynchronization().catch((error: unknown) => {
    if (__DEV__) {
      console.warn('[Game Center] Synchronization failed', error);
    }
  });
}

export function GameCenterProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    synchronize();

    const unsubscribeProgress = subscribeToAchievementProgress(synchronize);
    const unsubscribeLeaderboards = subscribeToLeaderboardScores(synchronize);
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          synchronize();
        }
      },
    );

    return () => {
      unsubscribeProgress();
      unsubscribeLeaderboards();
      appStateSubscription.remove();
    };
  }, []);

  return children;
}
