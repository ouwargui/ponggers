import { useEffect, useState } from 'react';

import {
  getLeaderboardStatisticsSnapshot,
  subscribeToLeaderboardScores,
} from '@/achievements/progress-storage';

export function useLeaderboardStatistics() {
  const [statistics, setStatistics] = useState(
    getLeaderboardStatisticsSnapshot,
  );

  useEffect(
    () =>
      subscribeToLeaderboardScores(() => {
        setStatistics(getLeaderboardStatisticsSnapshot());
      }),
    [],
  );

  return statistics;
}
