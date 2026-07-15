import { createContext, type ReactNode, use } from 'react';

import type { GameTheme } from '@/game/themes/types';

const GameThemeContext = createContext<GameTheme | null>(null);

type GameThemeProviderProps = {
  theme: GameTheme;
  children: ReactNode;
};

export function GameThemeProvider({ theme, children }: GameThemeProviderProps) {
  return (
    <GameThemeContext.Provider value={theme}>
      {children}
    </GameThemeContext.Provider>
  );
}

export function useGameTheme(): GameTheme {
  const theme = use(GameThemeContext);

  if (!theme) {
    throw new Error('useGameTheme must be used inside GameThemeProvider');
  }

  return theme;
}
