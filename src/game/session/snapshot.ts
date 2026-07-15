import {
  REPLICA_INTERPOLATION_EPSILON,
  REPLICA_INTERPOLATION_HALF_LIFE_SECONDS,
} from '@/game/constants';
import type {
  BallImpactEvent,
  BallState,
  MatchPhase,
  MatchState,
  PaddleState,
  PlayerId,
} from '@/game/engine/types';

export type SnapshotPaddleState = Pick<
  PaddleState,
  'centerX' | 'width' | 'velocityX'
>;

export type GameSnapshotMessage = {
  type: 'game-snapshot';
  tick: number;
  ball: BallState;
  lastImpact: BallImpactEvent | null;
  paddles: Record<PlayerId, SnapshotPaddleState>;
  match: MatchState;
};

export type GameSnapshotInbox = {
  receive(message: GameSnapshotMessage): GameSnapshotMessage | null;
};

export function createGameSnapshotMessage(
  tick: number,
  ball: BallState,
  topPaddle: PaddleState,
  bottomPaddle: PaddleState,
  match: MatchState,
  lastImpact: BallImpactEvent | null,
): GameSnapshotMessage {
  'worklet';

  return {
    type: 'game-snapshot',
    tick,
    ball,
    lastImpact,
    paddles: {
      top: {
        centerX: topPaddle.centerX,
        width: topPaddle.width,
        velocityX: topPaddle.velocityX,
      },
      bottom: {
        centerX: bottomPaddle.centerX,
        width: bottomPaddle.width,
        velocityX: bottomPaddle.velocityX,
      },
    },
    match,
  };
}

export function createGameSnapshotInbox(): GameSnapshotInbox {
  let lastReceivedTick = -1;

  return {
    receive(message) {
      if (message.tick <= lastReceivedTick) {
        return null;
      }

      lastReceivedTick = message.tick;
      return transformSnapshotForGuest(message);
    },
  };
}

export function transformSnapshotForGuest(
  snapshot: GameSnapshotMessage,
): GameSnapshotMessage {
  return {
    ...snapshot,
    ball: {
      ...snapshot.ball,
      position: {
        x: snapshot.ball.position.x,
        y: 1 - snapshot.ball.position.y,
      },
      velocity: {
        x: snapshot.ball.velocity.x,
        y: -snapshot.ball.velocity.y,
      },
    },
    lastImpact: snapshot.lastImpact
      ? {
          ...snapshot.lastImpact,
          playerId:
            snapshot.lastImpact.playerId === null
              ? null
              : mirrorPlayer(snapshot.lastImpact.playerId),
          normal: {
            x: snapshot.lastImpact.normal.x,
            y: -snapshot.lastImpact.normal.y,
          },
        }
      : null,
    paddles: {
      top: snapshot.paddles.bottom,
      bottom: snapshot.paddles.top,
    },
    match: mirrorMatch(snapshot.match),
  };
}

export function parseGameSnapshotMessage(
  value: Record<string, unknown>,
): GameSnapshotMessage | null {
  if (value.type !== 'game-snapshot' || !isNonNegativeInteger(value.tick)) {
    return null;
  }

  const ball = parseBall(value.ball);
  const lastImpact = parseImpact(value.lastImpact);
  const paddles = parsePaddles(value.paddles);
  const match = parseMatch(value.match);

  if (
    !ball ||
    (value.lastImpact !== null && !lastImpact) ||
    !paddles ||
    !match
  ) {
    return null;
  }

  return {
    type: value.type,
    tick: value.tick,
    ball,
    lastImpact,
    paddles,
    match,
  };
}

function parseImpact(value: unknown): BallImpactEvent | null {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    value.type !== 'ball-impact' ||
    typeof value.ballId !== 'string' ||
    (value.surface !== 'paddle' && value.surface !== 'wall') ||
    (value.playerId !== null && !isPlayerId(value.playerId)) ||
    !isFiniteNumber(value.intensity) ||
    value.intensity < 0 ||
    !isNonNegativeInteger(value.tick)
  ) {
    return null;
  }

  const normal = parseVector(value.normal);

  if (!normal) {
    return null;
  }

  return {
    type: value.type,
    ballId: value.ballId,
    surface: value.surface,
    playerId: value.playerId,
    normal,
    intensity: value.intensity,
    tick: value.tick,
  };
}

export function interpolateReplicaBall(
  current: BallState,
  target: BallState,
  deltaSeconds: number,
): BallState {
  'worklet';

  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return current;
  }

  const blend =
    1 - 0.5 ** (deltaSeconds / REPLICA_INTERPOLATION_HALF_LIFE_SECONDS);
  const interpolatedX =
    current.position.x + (target.position.x - current.position.x) * blend;
  const interpolatedY =
    current.position.y + (target.position.y - current.position.y) * blend;
  const x =
    Math.abs(target.position.x - interpolatedX) <= REPLICA_INTERPOLATION_EPSILON
      ? target.position.x
      : interpolatedX;
  const y =
    Math.abs(target.position.y - interpolatedY) <= REPLICA_INTERPOLATION_EPSILON
      ? target.position.y
      : interpolatedY;

  return {
    ...target,
    position: { x, y },
  };
}

export function applyReplicaPaddle(
  current: PaddleState,
  target: SnapshotPaddleState,
  deltaSeconds: number,
): PaddleState {
  'worklet';

  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return current;
  }

  const blend =
    1 - 0.5 ** (deltaSeconds / REPLICA_INTERPOLATION_HALF_LIFE_SECONDS);
  const interpolatedCenterX =
    current.centerX + (target.centerX - current.centerX) * blend;
  const centerX =
    Math.abs(target.centerX - interpolatedCenterX) <=
    REPLICA_INTERPOLATION_EPSILON
      ? target.centerX
      : interpolatedCenterX;

  return {
    ...current,
    centerX,
    width: target.width,
    velocityX: target.velocityX,
  };
}

function mirrorPlayer(player: PlayerId): PlayerId {
  return player === 'top' ? 'bottom' : 'top';
}

function mirrorMatch(match: MatchState): MatchState {
  return {
    ...match,
    score: {
      top: match.score.bottom,
      bottom: match.score.top,
    },
    phase: mirrorPhase(match.phase),
  };
}

function mirrorPhase(phase: MatchPhase): MatchPhase {
  switch (phase.type) {
    case 'countdown':
      return { ...phase, serveToward: mirrorPlayer(phase.serveToward) };
    case 'point-scored':
      return {
        ...phase,
        scorer: mirrorPlayer(phase.scorer),
        concededBy: mirrorPlayer(phase.concededBy),
      };
    case 'match-ended':
      return { ...phase, winner: mirrorPlayer(phase.winner) };
    case 'playing':
      return phase;
  }
}

function parseBall(value: unknown): BallState | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const position = parseVector(value.position);
  const velocity = parseVector(value.velocity);

  if (
    !position ||
    !velocity ||
    position.x < 0 ||
    position.x > 1 ||
    position.y < 0 ||
    position.y > 1
  ) {
    return null;
  }

  return { id: value.id, position, velocity };
}

function parsePaddles(
  value: unknown,
): Record<PlayerId, SnapshotPaddleState> | null {
  if (!isRecord(value)) {
    return null;
  }

  const top = parsePaddle(value.top);
  const bottom = parsePaddle(value.bottom);

  return top && bottom ? { top, bottom } : null;
}

function parsePaddle(value: unknown): SnapshotPaddleState | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.centerX) ||
    value.centerX < 0 ||
    value.centerX > 1 ||
    !isFiniteNumber(value.width) ||
    value.width <= 0 ||
    value.width > 1 ||
    !isFiniteNumber(value.velocityX)
  ) {
    return null;
  }

  return {
    centerX: value.centerX,
    width: value.width,
    velocityX: value.velocityX,
  };
}

function parseMatch(value: unknown): MatchState | null {
  if (
    !isRecord(value) ||
    !isRecord(value.score) ||
    !isNonNegativeInteger(value.score.top) ||
    !isNonNegativeInteger(value.score.bottom) ||
    !isNonNegativeInteger(value.winningScore) ||
    value.winningScore === 0 ||
    (value.rallyStartedAtTick !== null &&
      !isNonNegativeInteger(value.rallyStartedAtTick))
  ) {
    return null;
  }

  const phase = parsePhase(value.phase);

  if (!phase) {
    return null;
  }

  return {
    phase,
    score: { top: value.score.top, bottom: value.score.bottom },
    winningScore: value.winningScore,
    rallyStartedAtTick: value.rallyStartedAtTick,
  };
}

function parsePhase(value: unknown): MatchPhase | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  if (value.type === 'playing') {
    return { type: 'playing' };
  }

  if (
    value.type === 'countdown' &&
    isNonNegativeInteger(value.startedAtTick) &&
    isNonNegativeInteger(value.endsAtTick) &&
    isNonNegativeInteger(value.countFrom) &&
    value.countFrom > 0 &&
    isNonNegativeInteger(value.stepDurationTicks) &&
    value.stepDurationTicks > 0 &&
    isPlayerId(value.serveToward)
  ) {
    return {
      type: value.type,
      startedAtTick: value.startedAtTick,
      endsAtTick: value.endsAtTick,
      countFrom: value.countFrom,
      stepDurationTicks: value.stepDurationTicks,
      serveToward: value.serveToward,
    };
  }

  if (
    value.type === 'point-scored' &&
    isPlayerId(value.scorer) &&
    isPlayerId(value.concededBy) &&
    isNonNegativeInteger(value.endsAtTick)
  ) {
    return {
      type: value.type,
      scorer: value.scorer,
      concededBy: value.concededBy,
      endsAtTick: value.endsAtTick,
    };
  }

  if (value.type === 'match-ended' && isPlayerId(value.winner)) {
    return { type: value.type, winner: value.winner };
  }

  return null;
}

function parseVector(value: unknown) {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y)
  ) {
    return null;
  }

  return { x: value.x, y: value.y };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isPlayerId(value: unknown): value is PlayerId {
  return value === 'top' || value === 'bottom';
}
