export const EFFECT_LEVELS = ['off', 'subtle', 'full'] as const;

export type EffectLevel = (typeof EFFECT_LEVELS)[number];

export type GamePreferences = {
  haptics: EffectLevel;
  screenShake: EffectLevel;
  trails: EffectLevel;
};

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  haptics: 'full',
  screenShake: 'full',
  trails: 'full',
};

export const EFFECT_LEVEL_MULTIPLIER: Record<EffectLevel, number> = {
  off: 0,
  subtle: 0.45,
  full: 1,
};

export const GAME_PREFERENCES_STORAGE_KEY = 'ponggers.game-preferences.v1';

function isOneOf<T extends string>(
  value: unknown,
  choices: readonly T[],
): value is T {
  return typeof value === 'string' && choices.includes(value as T);
}

export function parseGamePreferences(
  value: string | null | undefined,
): GamePreferences {
  if (!value) {
    return DEFAULT_GAME_PREFERENCES;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_GAME_PREFERENCES;
    }

    const candidate = parsed as Partial<Record<keyof GamePreferences, unknown>>;

    return {
      haptics: isOneOf(candidate.haptics, EFFECT_LEVELS)
        ? candidate.haptics
        : DEFAULT_GAME_PREFERENCES.haptics,
      screenShake: isOneOf(candidate.screenShake, EFFECT_LEVELS)
        ? candidate.screenShake
        : DEFAULT_GAME_PREFERENCES.screenShake,
      trails: isOneOf(candidate.trails, EFFECT_LEVELS)
        ? candidate.trails
        : DEFAULT_GAME_PREFERENCES.trails,
    };
  } catch {
    return DEFAULT_GAME_PREFERENCES;
  }
}

export function getNextOption<T extends string>(
  current: T,
  options: readonly T[],
): T {
  const currentIndex = options.indexOf(current);
  return options[(currentIndex + 1) % options.length] ?? options[0] ?? current;
}

export function formatPreferenceValue(value: string): string {
  return value.toUpperCase();
}
