import type { GameThemePalette } from '@/game/themes/types';

export const PRISM_SPECTRUM = [
  '#ff65cf',
  '#b86cff',
  '#5d8dff',
  '#50efff',
  '#86ffd1',
  '#fff58a',
  '#ff9f5a',
] satisfies string[];

export const PRISM_SPECTRUM_LOOP = [
  ...PRISM_SPECTRUM,
  PRISM_SPECTRUM[0],
] satisfies string[];

export const prismPalette = {
  arena: '#030611',
  centerLine: {
    core: '#f8fbff',
    glow: '#82eaff',
  },
  ball: {
    core: '#fbfdff',
    glow: '#a9e9ff',
  },
  players: {
    top: {
      core: '#e5fcff',
      glow: '#50efff',
      label: 'CYAN',
    },
    bottom: {
      core: '#ffe8fb',
      glow: '#ff65cf',
      label: 'MAGENTA',
    },
  },
} satisfies GameThemePalette;
