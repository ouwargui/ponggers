import { describe, expect, test } from 'bun:test';

import {
  isPlayerLocallyControlled,
  LOCAL_MULTIPLAYER_SESSION,
  ONLINE_MULTIPLAYER_SESSION,
  SOLO_SESSION,
} from '@/game/session/definition';

describe('game session definitions', () => {
  test('routes both local multiplayer paddles to device input', () => {
    expect(isPlayerLocallyControlled(LOCAL_MULTIPLAYER_SESSION, 'top')).toBe(
      true,
    );
    expect(isPlayerLocallyControlled(LOCAL_MULTIPLAYER_SESSION, 'bottom')).toBe(
      true,
    );
  });

  test('reserves the opponent paddle for AI in solo sessions', () => {
    expect(SOLO_SESSION.inputSources.top).toBe('ai');
    expect(SOLO_SESSION.inputSources.bottom).toBe('local');
  });

  test('reserves the opponent paddle for remote input online', () => {
    expect(ONLINE_MULTIPLAYER_SESSION.inputSources.top).toBe('remote');
    expect(ONLINE_MULTIPLAYER_SESSION.inputSources.bottom).toBe('local');
  });
});
