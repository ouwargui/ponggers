import type { GameThemePalette } from '@/game/themes/types';

export const neonPalette = {
  arena: '#02050a',
  centerLine: {
    core: '#b9fbff',
    glow: '#00e5ff',
  },
  ball: {
    core: '#ffffff',
    glow: '#7df9ff',
  },
  players: {
    top: {
      label: 'ORANGE',
      core: '#fff1e8',
      glow: '#ff5a1f',
    },
    bottom: {
      label: 'CYAN',
      core: '#e7fdff',
      glow: '#00e5ff',
    },
  },
} satisfies GameThemePalette;
