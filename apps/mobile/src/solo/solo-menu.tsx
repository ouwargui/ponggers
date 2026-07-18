import type { Href } from 'expo-router';

import type { AiDifficultyLevel } from '@/game/ai/ai-difficulty';
import { GameMenu, GameMenuButton } from '@/menu/game-menu';

const DIFFICULTIES: Array<{
  accessibilityHint: string;
  label: string;
  level: AiDifficultyLevel;
}> = [
  {
    level: 'easy',
    label: 'EASY',
    accessibilityHint: 'Starts a forgiving solo match',
  },
  {
    level: 'medium',
    label: 'MEDIUM',
    accessibilityHint: 'Starts a balanced solo match',
  },
  {
    level: 'hard',
    label: 'IMPOSSIBLE',
    accessibilityHint: 'Starts a challenging solo match',
  },
];

export function SoloMenu() {
  return (
    <GameMenu>
      {DIFFICULTIES.map(({ accessibilityHint, label, level }) => (
        <GameMenuButton
          key={level}
          href={`/game/solo?difficulty=${level}` as Href}
          label={label}
          accessibilityHint={accessibilityHint}
          replace
        />
      ))}
    </GameMenu>
  );
}
