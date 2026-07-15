import type { PlayerId } from '@/game/engine/types';

export type GameMode = 'solo' | 'local-multiplayer' | 'online-multiplayer';
export type HudOrientation = 'screen' | 'face-to-face';
export type PlayerInputSource = 'local' | 'remote' | 'ai';

export type GameSessionDefinition = {
  mode: GameMode;
  hudOrientation: HudOrientation;
  localPlayerId: PlayerId | null;
  inputSources: Record<PlayerId, PlayerInputSource>;
};

export const LOCAL_MULTIPLAYER_SESSION = {
  mode: 'local-multiplayer',
  hudOrientation: 'face-to-face',
  localPlayerId: null,
  inputSources: {
    top: 'local',
    bottom: 'local',
  },
} satisfies GameSessionDefinition;

export const SOLO_SESSION = {
  mode: 'solo',
  hudOrientation: 'screen',
  localPlayerId: 'bottom',
  inputSources: {
    top: 'ai',
    bottom: 'local',
  },
} satisfies GameSessionDefinition;

export const ONLINE_MULTIPLAYER_SESSION = {
  mode: 'online-multiplayer',
  hudOrientation: 'screen',
  localPlayerId: 'bottom',
  inputSources: {
    top: 'remote',
    bottom: 'local',
  },
} satisfies GameSessionDefinition;

export function isPlayerLocallyControlled(
  session: GameSessionDefinition,
  playerId: PlayerId,
) {
  return session.inputSources[playerId] === 'local';
}
