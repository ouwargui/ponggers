import type { Href } from 'expo-router';

import type { AiDifficultyLevel } from '@/game/ai/ai-difficulty';
import { GameMenu, GameMenuButton, GameMenuTitle } from '@/menu/game-menu';

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
    label: 'HARD',
    accessibilityHint: 'Starts a challenging solo match',
  },
];

export function SoloMenu() {
  return (
    <GameMenu>
      <GameMenuTitle>DIFFICULTY</GameMenuTitle>
      {DIFFICULTIES.map(({ accessibilityHint, label, level }) => (
        <GameMenuButton
          key={level}
          href={`/game/solo?difficulty=${level}` as Href}
          label={label}
          accessibilityHint={accessibilityHint}
        />
      ))}
      <GameMenuButton
        href="/"
        label="BACK"
        accessibilityHint="Returns to the main menu"
      />
    </GameMenu>
  );
}
