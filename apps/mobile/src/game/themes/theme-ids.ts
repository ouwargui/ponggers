export const GAME_THEME_IDS = ['neon', 'volt', 'prism'] as const;

export type GameThemeId = (typeof GAME_THEME_IDS)[number];
