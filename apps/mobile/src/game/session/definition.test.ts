import { describe, expect, test } from 'bun:test';

import {
  getAiControlledPlayer,
  getLatencyIndicatorPlayer,
  getRemotelyControlledPlayer,
  isPlayerLocallyControlled,
  LOCAL_MULTIPLAYER_SESSION,
  ONLINE_MULTIPLAYER_GUEST_SESSION,
  ONLINE_MULTIPLAYER_HOST_SESSION,
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
    expect(getAiControlledPlayer(SOLO_SESSION)).toBe('top');
  });

  test('reserves the opponent paddle for remote input online', () => {
    expect(ONLINE_MULTIPLAYER_SESSION.inputSources.top).toBe('remote');
    expect(ONLINE_MULTIPLAYER_SESSION.inputSources.bottom).toBe('local');
    expect(getRemotelyControlledPlayer(ONLINE_MULTIPLAYER_SESSION)).toBe('top');
  });

  test('has no remote player in local multiplayer', () => {
    expect(getRemotelyControlledPlayer(LOCAL_MULTIPLAYER_SESSION)).toBeNull();
    expect(getAiControlledPlayer(LOCAL_MULTIPLAYER_SESSION)).toBeNull();
  });

  test('shows opponent latency for the host', () => {
    expect(getLatencyIndicatorPlayer(ONLINE_MULTIPLAYER_HOST_SESSION)).toBe(
      'top',
    );
  });

  test('shows local latency for the guest', () => {
    expect(getLatencyIndicatorPlayer(ONLINE_MULTIPLAYER_GUEST_SESSION)).toBe(
      'bottom',
    );
  });

  test('does not show latency outside online multiplayer', () => {
    expect(getLatencyIndicatorPlayer(LOCAL_MULTIPLAYER_SESSION)).toBeNull();
    expect(getLatencyIndicatorPlayer(SOLO_SESSION)).toBeNull();
  });
});
