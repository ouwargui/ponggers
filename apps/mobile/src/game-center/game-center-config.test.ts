import { describe, expect, test } from 'bun:test';

import {
  isGameCenterEnabled,
  isGameCenterFeatureEnabled,
} from '@/game-center/game-center-config';

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

  test('keeps individual Game Center features fail-closed', () => {
    expect(isGameCenterFeatureEnabled('true', 'true')).toBe(true);
    expect(isGameCenterFeatureEnabled('true', 'false')).toBe(false);
    expect(isGameCenterFeatureEnabled('false', 'true')).toBe(false);
    expect(isGameCenterFeatureEnabled(undefined, 'true')).toBe(false);
  });
});
