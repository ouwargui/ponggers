import type { PlayerId } from '@/game/engine/types';

export type GameMode = 'solo' | 'local-multiplayer' | 'online-multiplayer';
export type HudOrientation = 'screen' | 'face-to-face';

export type GameSessionConfig = {
  mode: GameMode;
  hudOrientation: HudOrientation;
  localPlayerId: PlayerId | null;
};

export const LOCAL_MULTIPLAYER_SESSION = {
  mode: 'local-multiplayer',
  hudOrientation: 'face-to-face',
  localPlayerId: null,
} satisfies GameSessionConfig;

export const SOLO_SESSION = {
  mode: 'solo',
  hudOrientation: 'screen',
  localPlayerId: 'bottom',
} satisfies GameSessionConfig;

export const ONLINE_MULTIPLAYER_SESSION = {
  mode: 'online-multiplayer',
  hudOrientation: 'screen',
  localPlayerId: 'bottom',
} satisfies GameSessionConfig;
