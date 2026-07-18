import { describe, expect, test } from 'bun:test';

import {
  DEFAULT_GAME_PREFERENCES,
  getNextOption,
  parseGamePreferences,
} from '@/settings/game-preferences';

describe('parseGamePreferences', () => {
  test('uses defaults when storage is empty or malformed', () => {
    expect(parseGamePreferences(null)).toEqual(DEFAULT_GAME_PREFERENCES);
    expect(parseGamePreferences('{nope')).toEqual(DEFAULT_GAME_PREFERENCES);
  });

  test('keeps valid values and repairs invalid fields', () => {
    expect(
      parseGamePreferences(
        JSON.stringify({
          haptics: 'subtle',
          screenShake: 'maximum',
          themeId: 'volt',
          trails: 'off',
        }),
      ),
    ).toEqual({
      haptics: 'subtle',
      screenShake: 'full',
      themeId: 'volt',
      trails: 'off',
    });

    expect(
      parseGamePreferences(JSON.stringify({ themeId: 'missing' })).themeId,
    ).toBe('neon');
  });
});

describe('getNextOption', () => {
  test('cycles through a preference list', () => {
    const options = ['off', 'subtle', 'full'] as const;

    expect(getNextOption('off', options)).toBe('subtle');
    expect(getNextOption('full', options)).toBe('off');
  });
});
