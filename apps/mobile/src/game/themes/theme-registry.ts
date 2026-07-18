import { neonTheme } from '@/game/themes/neon/neon-theme';
import type { GameTheme } from '@/game/themes/types';

export const gameThemeRegistry = {
  neon: neonTheme,
} satisfies Record<string, GameTheme>;

export type GameThemeId = keyof typeof gameThemeRegistry;

export const defaultGameTheme = gameThemeRegistry.neon;

export function getRegisteredGameTheme(id: string): GameTheme | null {
  return Object.hasOwn(gameThemeRegistry, id)
    ? gameThemeRegistry[id as GameThemeId]
    : null;
}
