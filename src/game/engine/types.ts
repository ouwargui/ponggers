export type EntityId = string;
export type PlayerId = 'top' | 'bottom';

export type Vector2 = {
  x: number;
  y: number;
};

// Positions use 0...1 world coordinates so simulation snapshots are device-independent.
export type NormalizedPoint = Vector2;

export type PaddleState = {
  id: PlayerId;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  velocityX: number;
};

export type BallState = {
  id: EntityId;
  position: NormalizedPoint;
  velocity: Vector2;
};

export type BallImpactEvent = {
  type: 'ball-impact';
  ballId: EntityId;
  surface: 'paddle' | 'wall';
  normal: Vector2;
  intensity: number;
  tick: number;
};

export type GoalEvent = {
  type: 'goal';
  ballId: EntityId;
  scorer: PlayerId;
  concededBy: PlayerId;
  boundary: PlayerId;
  tick: number;
};

export type GameEvent = BallImpactEvent | GoalEvent;

export type MatchPhase =
  | {
      type: 'countdown';
      endsAtTick: number;
      serveToward: PlayerId;
    }
  | {
      type: 'playing';
    }
  | {
      type: 'point-scored';
      scorer: PlayerId;
      concededBy: PlayerId;
      endsAtTick: number;
    }
  | {
      type: 'match-ended';
      winner: PlayerId;
    };

export type MatchState = {
  phase: MatchPhase;
  score: Record<PlayerId, number>;
  winningScore: number;
  rallyStartedAtTick: number | null;
};

export type SpecialEffect =
  | {
      type: 'speed-ball';
      multiplier: number;
      durationTicks: number;
    }
  | {
      type: 'spawn-ball';
      direction: 'opposite' | 'random';
    }
  | {
      type: 'shrink-paddle';
      minimumWidth: number;
    };

export type SpecialState = {
  id: EntityId;
  position: NormalizedPoint;
  radius: number;
  spawnedAtTick: number;
  effect: SpecialEffect;
};

export type ActiveEffect = {
  id: EntityId;
  type: 'ball-speed';
  ballId: EntityId;
  multiplier: number;
  expiresAtTick: number;
};

export type GameState = {
  tick: number;
  match: MatchState;
  paddles: Record<PlayerId, PaddleState>;
  balls: BallState[];
  specials: SpecialState[];
  activeEffects: ActiveEffect[];
};

export type PaddleInput = {
  type: 'paddle-input';
  playerId: PlayerId;
  sequence: number;
  centerX: number;
  clientTick: number;
};
