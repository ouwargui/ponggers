import type { ComponentType } from 'react';
import type { TextStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { MatchState, PlayerId } from '@/game/engine/types';
import type { ImpactParticle } from '@/game/presentation/impact-particles';
import type {
  CanvasSize,
  GameGeometry,
  SceneBall,
  ScenePaddle,
} from '@/game/rendering/types';
import type { HudOrientation } from '@/game/session/definition';
import type { EffectLevel } from '@/settings/game-preferences';

export type GlowPalette = {
  core: string;
  glow: string;
};

export type PlayerPalette = GlowPalette & {
  label: string;
};

export type GameThemePalette = {
  arena: string;
  centerLine: GlowPalette;
  ball: GlowPalette;
  players: Record<PlayerId, PlayerPalette>;
};

export type CenterLineRendererProps = {
  line: GameGeometry['centerLine'];
};

export type ArenaRendererProps = {
  canvasSize: SharedValue<CanvasSize>;
  rallyHitCount?: SharedValue<number>;
};

export type PaddleRendererProps = {
  paddle: ScenePaddle;
  trailIntensity: number;
};

export type BallRendererProps = {
  ball: SceneBall;
  trailIntensity: number;
};

export type RallyCounterRendererProps = {
  hitCount: SharedValue<number>;
};

export type ImpactParticlesRendererProps = {
  particles: SharedValue<ImpactParticle[]>;
};

export type MatchOverlayRendererProps = {
  match: MatchState;
  countdown: number | null;
  hudOrientation: HudOrientation;
  localPlayerId: PlayerId | null;
  topInset: number;
  bottomInset: number;
  hapticsLevel: EffectLevel;
  onRematch: () => void;
};

export type LatencyIndicatorRendererProps = {
  latencyMs: number;
  player: PlayerId;
  topInset: number;
  bottomInset: number;
};

export type PauseMenuRendererProps = {
  freezesSimulation: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onQuit: (() => void) | null;
  onResume: () => void;
};

export type GameThemeRenderers = {
  Arena: ComponentType<ArenaRendererProps>;
  CenterLine: ComponentType<CenterLineRendererProps>;
  Paddle: ComponentType<PaddleRendererProps>;
  Ball: ComponentType<BallRendererProps>;
  ImpactParticles: ComponentType<ImpactParticlesRendererProps>;
  RallyCounter: ComponentType<RallyCounterRendererProps>;
  MatchOverlay: ComponentType<MatchOverlayRendererProps>;
  LatencyIndicator: ComponentType<LatencyIndicatorRendererProps>;
  PauseMenu: ComponentType<PauseMenuRendererProps>;
};

export type GameTheme = {
  effects: {
    textGlow: (color: string, radius: number) => TextStyle;
  };
  id: string;
  name: string;
  palette: GameThemePalette;
  renderers: GameThemeRenderers;
};
