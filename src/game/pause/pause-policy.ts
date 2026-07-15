import type { GameMode } from '@/game/session/definition';

export function pauseMenuFreezesSimulation(mode: GameMode) {
  return mode !== 'online-multiplayer';
}
