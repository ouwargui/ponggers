import { describe, expect, test } from 'bun:test';

import { pauseMenuFreezesSimulation } from '@/game/pause/pause-policy';

describe('pause menu policy', () => {
  test('freezes local and solo simulations', () => {
    expect(pauseMenuFreezesSimulation('solo')).toBe(true);
    expect(pauseMenuFreezesSimulation('local-multiplayer')).toBe(true);
  });

  test('keeps online matches running', () => {
    expect(pauseMenuFreezesSimulation('online-multiplayer')).toBe(false);
  });
});
