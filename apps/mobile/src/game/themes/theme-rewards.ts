import { getRegisteredGameTheme } from '@/game/themes/theme-registry';
import type { GameTheme } from '@/game/themes/types';

export const THEME_REWARDS = {
  volt: {
    id: 'volt',
    name: 'VOLT',
  },
  grid: {
    id: 'grid',
    name: 'GRID',
  },
  hyper: {
    id: 'hyper',
    name: 'HYPER',
  },
  void: {
    id: 'void',
    name: 'VOID',
  },
  prism: {
    id: 'prism',
    name: 'PRISM',
  },
  synth: {
    id: 'synth',
    name: 'SYNTH',
  },
  link: {
    id: 'link',
    name: 'LINK',
  },
  eclipse: {
    id: 'eclipse',
    name: 'ECLIPSE',
  },
} as const;

export type ThemeRewardId = keyof typeof THEME_REWARDS;

export type ThemeReward = (typeof THEME_REWARDS)[ThemeRewardId];

export function getThemeReward(id: ThemeRewardId): ThemeReward {
  return THEME_REWARDS[id];
}

export function getImplementedRewardTheme(id: ThemeRewardId): GameTheme | null {
  return getRegisteredGameTheme(id);
}
