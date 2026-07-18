import { type PropsWithChildren, useEffect } from 'react';
import { AppState } from 'react-native';

import { requestGameCenterSynchronization } from '@/achievements/game-center-client';
import { subscribeToAchievementProgress } from '@/achievements/progress-storage';

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
      appStateSubscription.remove();
    };
  }, []);

  return children;
}
