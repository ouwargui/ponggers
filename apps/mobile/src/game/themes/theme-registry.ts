import { neonTheme } from '@/game/themes/neon/neon-theme';
import { prismTheme } from '@/game/themes/prism/prism-theme';
import { GAME_THEME_IDS, type GameThemeId } from '@/game/themes/theme-ids';
import type { GameTheme } from '@/game/themes/types';
import { voltTheme } from '@/game/themes/volt/volt-theme';

export const gameThemeRegistry = {
  neon: neonTheme,
  volt: voltTheme,
  prism: prismTheme,
} satisfies Record<GameThemeId, GameTheme>;

export const defaultGameTheme = gameThemeRegistry.neon;

export function getRegisteredGameTheme(id: string): GameTheme | null {
  return GAME_THEME_IDS.includes(id as GameThemeId)
    ? gameThemeRegistry[id as GameThemeId]
    : null;
}

export type { GameThemeId } from '@/game/themes/theme-ids';
