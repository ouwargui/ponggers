import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import {
  AI_DIFFICULTIES,
  resolveAiDifficultyLevel,
} from '@/game/ai/ai-difficulty';
import { GameScreen } from '@/game/game-screen';
import { SOLO_SESSION } from '@/game/session/definition';

export default function SoloGameScreen() {
  const router = useRouter();
  const { difficulty } = useLocalSearchParams<{
    difficulty?: string | string[];
  }>();
  const difficultyLevel = resolveAiDifficultyLevel(difficulty);
  const quitMatch = useCallback(() => {
    router.replace('/');
  }, [router]);

  return (
    <GameScreen
      aiDifficulty={AI_DIFFICULTIES[difficultyLevel]}
      aiDifficultyLevel={difficultyLevel}
      session={SOLO_SESSION}
      onQuit={quitMatch}
    />
  );
}
