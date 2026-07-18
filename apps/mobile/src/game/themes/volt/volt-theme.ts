import { NeonMatchOverlay } from '@/game/themes/neon/neon-match-overlay';
import type { GameTheme } from '@/game/themes/types';
import { VoltImpactParticles } from '@/game/themes/volt/volt-impact-particles';
import { VoltLatencyIndicator } from '@/game/themes/volt/volt-latency-indicator';
import { VoltPauseMenu } from '@/game/themes/volt/volt-pause-menu';
import { VoltRallyCounter } from '@/game/themes/volt/volt-rally-counter';
import {
  VoltArena,
  VoltBall,
  VoltCenterLine,
  VoltPaddle,
} from '@/game/themes/volt/volt-renderers';
import { voltTextGlow } from '@/game/themes/volt/volt-text-glow';
import { voltPalette } from '@/game/themes/volt/volt-tokens';

export const voltTheme = {
  effects: {
    textGlow: voltTextGlow,
  },
  id: 'volt',
  name: 'Volt',
  palette: voltPalette,
  renderers: {
    Arena: VoltArena,
    CenterLine: VoltCenterLine,
    Paddle: VoltPaddle,
    Ball: VoltBall,
    ImpactParticles: VoltImpactParticles,
    RallyCounter: VoltRallyCounter,
    MatchOverlay: NeonMatchOverlay,
    LatencyIndicator: VoltLatencyIndicator,
    PauseMenu: VoltPauseMenu,
  },
} satisfies GameTheme;
