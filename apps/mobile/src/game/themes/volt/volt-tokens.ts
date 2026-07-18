import type { GameThemePalette } from '@/game/themes/types';

export const voltPalette = {
  arena: '#060806',
  centerLine: {
    core: '#f5ffc7',
    glow: '#dfff28',
  },
  ball: {
    core: '#ffffff',
    glow: '#efff9a',
  },
  players: {
    top: {
      label: 'VIOLET',
      core: '#f1e7ff',
      glow: '#9b5cff',
    },
    bottom: {
      label: 'VOLT',
      core: '#faffd6',
      glow: '#dfff28',
    },
  },
} satisfies GameThemePalette;
