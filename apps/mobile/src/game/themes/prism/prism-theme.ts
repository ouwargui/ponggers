import { NeonMatchOverlay } from '@/game/themes/neon/neon-match-overlay';
import { PrismImpactParticles } from '@/game/themes/prism/prism-impact-particles';
import { PrismLatencyIndicator } from '@/game/themes/prism/prism-latency-indicator';
import { PrismPauseMenu } from '@/game/themes/prism/prism-pause-menu';
import { PrismRallyCounter } from '@/game/themes/prism/prism-rally-counter';
import {
  PrismArena,
  PrismBall,
  PrismCenterLine,
  PrismPaddle,
} from '@/game/themes/prism/prism-renderers';
import { prismTextGlow } from '@/game/themes/prism/prism-text-glow';
import { prismPalette } from '@/game/themes/prism/prism-tokens';
import type { GameTheme } from '@/game/themes/types';

export const prismTheme = {
  effects: {
    textGlow: prismTextGlow,
  },
  id: 'prism',
  name: 'Prism',
  palette: prismPalette,
  renderers: {
    Arena: PrismArena,
    CenterLine: PrismCenterLine,
    Paddle: PrismPaddle,
    Ball: PrismBall,
    ImpactParticles: PrismImpactParticles,
    RallyCounter: PrismRallyCounter,
    MatchOverlay: NeonMatchOverlay,
    LatencyIndicator: PrismLatencyIndicator,
    PauseMenu: PrismPauseMenu,
  },
} satisfies GameTheme;
