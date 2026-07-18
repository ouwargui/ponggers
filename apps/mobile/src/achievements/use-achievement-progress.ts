import { useEffect, useState } from 'react';

import {
  getAchievementProgressSnapshot,
  subscribeToAchievementProgress,
} from '@/achievements/progress-storage';

export function useAchievementProgress() {
  const [snapshot, setSnapshot] = useState(getAchievementProgressSnapshot);

  useEffect(
    () =>
      subscribeToAchievementProgress(() => {
        setSnapshot(getAchievementProgressSnapshot());
      }),
    [],
  );

  return snapshot;
}
