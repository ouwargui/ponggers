export const GAME_THEME_IDS = ['neon', 'volt'] as const;

export type GameThemeId = (typeof GAME_THEME_IDS)[number];
