import {
  NeonArena,
  NeonBall,
  NeonCenterLine,
  NeonPaddle,
  NeonScoreHud,
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
    ScoreHud: NeonScoreHud,
  },
} satisfies GameTheme;
