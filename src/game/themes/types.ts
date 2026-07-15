import type { ComponentType } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type { PlayerId } from '@/game/engine/types';
import type {
  CanvasSize,
  GameGeometry,
  SceneBall,
  ScenePaddle,
} from '@/game/rendering/types';

export type GlowPalette = {
  core: string;
  glow: string;
};

export type GameThemePalette = {
  arena: string;
  centerLine: GlowPalette;
  ball: GlowPalette;
  players: Record<PlayerId, GlowPalette>;
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

export type ScoreHudRendererProps = {
  score: Record<PlayerId, number>;
  topInset: number;
  bottomInset: number;
};

export type GameThemeRenderers = {
  Arena: ComponentType<ArenaRendererProps>;
  CenterLine: ComponentType<CenterLineRendererProps>;
  Paddle: ComponentType<PaddleRendererProps>;
  Ball: ComponentType<BallRendererProps>;
  ScoreHud: ComponentType<ScoreHudRendererProps>;
};

export type GameTheme = {
  id: string;
  name: string;
  palette: GameThemePalette;
  renderers: GameThemeRenderers;
};
