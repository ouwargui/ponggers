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
          trails: 'off',
        }),
      ),
    ).toEqual({
      haptics: 'subtle',
      screenShake: 'full',
      trails: 'off',
    });
  });
});

describe('getNextOption', () => {
  test('cycles through a preference list', () => {
    const options = ['off', 'subtle', 'full'] as const;

    expect(getNextOption('off', options)).toBe('subtle');
    expect(getNextOption('full', options)).toBe('off');
  });
});
