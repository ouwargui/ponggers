import type { PlayerId } from '@/game/engine/types';

export type GameMode = 'solo' | 'local-multiplayer' | 'online-multiplayer';
export type HudOrientation = 'screen' | 'face-to-face';
export type PlayerInputSource = 'local' | 'remote' | 'ai';
export type OnlineSessionRole = 'host' | 'guest';

export type GameSessionDefinition = {
  mode: GameMode;
  hudOrientation: HudOrientation;
  localPlayerId: PlayerId | null;
  onlineRole: OnlineSessionRole | null;
  inputSources: Record<PlayerId, PlayerInputSource>;
};

export const LOCAL_MULTIPLAYER_SESSION = {
  mode: 'local-multiplayer',
  hudOrientation: 'face-to-face',
  localPlayerId: null,
  onlineRole: null,
  inputSources: {
    top: 'local',
    bottom: 'local',
  },
} satisfies GameSessionDefinition;

export const SOLO_SESSION = {
  mode: 'solo',
  hudOrientation: 'screen',
  localPlayerId: 'bottom',
  onlineRole: null,
  inputSources: {
    top: 'ai',
    bottom: 'local',
  },
} satisfies GameSessionDefinition;

export const ONLINE_MULTIPLAYER_HOST_SESSION = {
  mode: 'online-multiplayer',
  hudOrientation: 'screen',
  localPlayerId: 'bottom',
  onlineRole: 'host',
  inputSources: {
    top: 'remote',
    bottom: 'local',
  },
} satisfies GameSessionDefinition;

export const ONLINE_MULTIPLAYER_GUEST_SESSION = {
  ...ONLINE_MULTIPLAYER_HOST_SESSION,
  onlineRole: 'guest',
} satisfies GameSessionDefinition;

export const ONLINE_MULTIPLAYER_SESSION = ONLINE_MULTIPLAYER_HOST_SESSION;

export function isPlayerLocallyControlled(
  session: GameSessionDefinition,
  playerId: PlayerId,
) {
  return session.inputSources[playerId] === 'local';
}

export function getRemotelyControlledPlayer(
  session: GameSessionDefinition,
): PlayerId | null {
  if (session.inputSources.top === 'remote') {
    return 'top';
  }

  if (session.inputSources.bottom === 'remote') {
    return 'bottom';
  }

  return null;
}

export function getAiControlledPlayer(
  session: GameSessionDefinition,
): PlayerId | null {
  if (session.inputSources.top === 'ai') {
    return 'top';
  }

  if (session.inputSources.bottom === 'ai') {
    return 'bottom';
  }

  return null;
}

export function getLatencyIndicatorPlayer(
  session: GameSessionDefinition,
): PlayerId | null {
  if (session.mode !== 'online-multiplayer') {
    return null;
  }

  if (session.onlineRole === 'host') {
    return getRemotelyControlledPlayer(session);
  }

  return session.onlineRole === 'guest' ? session.localPlayerId : null;
}
