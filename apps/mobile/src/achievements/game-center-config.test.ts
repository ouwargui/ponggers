import { describe, expect, test } from 'bun:test';

import { isGameCenterEnabled } from '@/achievements/game-center-config';

describe('Game Center configuration', () => {
  test('stays disabled unless explicitly enabled', () => {
    expect(isGameCenterEnabled(undefined)).toBe(false);
    expect(isGameCenterEnabled('')).toBe(false);
    expect(isGameCenterEnabled('false')).toBe(false);
    expect(isGameCenterEnabled('TRUE')).toBe(false);
  });

  test('enables only for the explicit true value', () => {
    expect(isGameCenterEnabled('true')).toBe(true);
  });
});
