import type { ComponentType } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type { MatchState, PlayerId } from '@/game/engine/types';
import type {
  CanvasSize,
  GameGeometry,
  SceneBall,
  ScenePaddle,
} from '@/game/rendering/types';
import type { HudOrientation } from '@/game/session-config';

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
};

export type PaddleRendererProps = {
  paddle: ScenePaddle;
};

export type BallRendererProps = {
  ball: SceneBall;
};

export type MatchOverlayRendererProps = {
  match: MatchState;
  countdown: number | null;
  hudOrientation: HudOrientation;
  localPlayerId: PlayerId | null;
  topInset: number;
  bottomInset: number;
  onRematch: () => void;
};

export type GameThemeRenderers = {
  Arena: ComponentType<ArenaRendererProps>;
  CenterLine: ComponentType<CenterLineRendererProps>;
  Paddle: ComponentType<PaddleRendererProps>;
  Ball: ComponentType<BallRendererProps>;
  MatchOverlay: ComponentType<MatchOverlayRendererProps>;
};

export type GameTheme = {
  id: string;
  name: string;
  palette: GameThemePalette;
  renderers: GameThemeRenderers;
};
