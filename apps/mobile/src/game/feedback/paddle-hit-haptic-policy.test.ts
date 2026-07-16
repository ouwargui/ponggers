import { describe, expect, test } from 'bun:test';

import type { BallImpactEvent } from '@/game/engine/types';
import {
  getPaddleHapticPlayers,
  getPaddleHitHapticStrength,
  shouldPlayPaddleHitHaptic,
} from '@/game/feedback/paddle-hit-haptic-policy';

function createImpact(
  playerId: BallImpactEvent['playerId'],
  overrides: Partial<BallImpactEvent> = {},
): BallImpactEvent {
  return {
    type: 'ball-impact',
    ballId: 'ball-1',
    surface: playerId === null ? 'wall' : 'paddle',
    playerId,
    normal: { x: 0, y: 1 },
    intensity: 0.5,
    tick: 42,
    ...overrides,
  };
}

describe('paddle hit haptic policy', () => {
  test('enables both paddle impacts in every mode', () => {
    expect(getPaddleHapticPlayers(true)).toEqual({
      top: true,
      bottom: true,
    });
    expect(getPaddleHapticPlayers(false)).toEqual({
      top: false,
      bottom: false,
    });
  });

  test('plays for both paddles when both are locally controlled', () => {
    const localPlayers = { top: true, bottom: true };

    expect(
      shouldPlayPaddleHitHaptic(createImpact('top'), null, localPlayers),
    ).toBe(true);
    expect(
      shouldPlayPaddleHitHaptic(createImpact('bottom'), null, localPlayers),
    ).toBe(true);
  });

  test('plays only for enabled paddle ownership', () => {
    const localPlayers = { top: false, bottom: true };

    expect(
      shouldPlayPaddleHitHaptic(createImpact('top'), null, localPlayers),
    ).toBe(false);
    expect(
      shouldPlayPaddleHitHaptic(createImpact('bottom'), null, localPlayers),
    ).toBe(true);
  });

  test('ignores wall hits and duplicate impact events', () => {
    const localPlayers = { top: true, bottom: true };
    const impact = createImpact('bottom');

    expect(
      shouldPlayPaddleHitHaptic(createImpact(null), null, localPlayers),
    ).toBe(false);
    expect(shouldPlayPaddleHitHaptic(impact, impact, localPlayers)).toBe(false);
  });

  test('scales feedback strength with collision intensity', () => {
    expect(getPaddleHitHapticStrength(0.2)).toBe('light');
    expect(getPaddleHitHapticStrength(0.6)).toBe('medium');
    expect(getPaddleHitHapticStrength(0.9)).toBe('heavy');
  });
});
