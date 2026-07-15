import { NeonLatencyIndicator } from '@/game/themes/neon/neon-latency-indicator';
import { NeonMatchOverlay } from '@/game/themes/neon/neon-match-overlay';
import {
  NeonArena,
  NeonBall,
  NeonCenterLine,
  NeonPaddle,
} from '@/game/themes/neon/neon-renderers';
import { neonPalette } from '@/game/themes/neon/neon-tokens';
import type { GameTheme } from '@/game/themes/types';

export const neonTheme = {
  id: 'neon',
  name: 'Neon',
  palette: neonPalette,
  renderers: {
    Arena: NeonArena,
    CenterLine: NeonCenterLine,
    Paddle: NeonPaddle,
    Ball: NeonBall,
    MatchOverlay: NeonMatchOverlay,
    LatencyIndicator: NeonLatencyIndicator,
  },
} satisfies GameTheme;
