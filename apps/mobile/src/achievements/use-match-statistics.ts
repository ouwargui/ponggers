import { useCallback, useRef } from 'react';

import { recordPointProgress } from '@/achievements/progress-storage';
import {
  createMatchTrackingState,
  createStatisticsSessionContext,
} from '@/achievements/statistics';
import type { AiDifficultyLevel } from '@/game/ai/ai-difficulty';
import type { PointCompletedEvent } from '@/game/engine/types';
import type { GameSessionDefinition } from '@/game/session/definition';

type MatchStatisticsOptions = {
  aiDifficultyLevel?: AiDifficultyLevel;
  enabled: boolean;
  session: GameSessionDefinition;
};

export function useMatchStatistics({
  aiDifficultyLevel,
  enabled,
  session,
}: MatchStatisticsOptions) {
  const tracking = useRef(createMatchTrackingState());
  const context = createStatisticsSessionContext(session, aiDifficultyLevel);
  const mode = context.mode;
  const localPlayerId = context.localPlayerId;

  const onPointCompleted = useCallback(
    (event: PointCompletedEvent) => {
      if (!enabled) {
        return;
      }

      tracking.current = recordPointProgress(
        event,
        { mode, localPlayerId, aiDifficultyLevel },
        tracking.current,
      );
    },
    [aiDifficultyLevel, enabled, localPlayerId, mode],
  );
  const onMatchRestarted = useCallback(() => {
    tracking.current = createMatchTrackingState();
  }, []);

  return { onMatchRestarted, onPointCompleted };
}
