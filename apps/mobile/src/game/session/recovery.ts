import type {
  BallImpactEvent,
  BallState,
  MatchPhase,
  MatchState,
  PaddleState,
  PlayerId,
} from '@/game/engine/types';
import type { OnlineSessionRole } from '@/game/session/definition';
import type { RallyAuthorityState } from '@/game/session/rally';

export type MatchStateRequestMessage = {
  type: 'match-state-request';
  id: number;
  playerRole: OnlineSessionRole;
};

export type MatchStateMessage = {
  type: 'match-state';
  requestId: number;
  playerRole: OnlineSessionRole;
  tick: number;
  authority: RallyAuthorityState;
  ball: BallState;
  paddle: PaddleState;
  match: MatchState;
  lastImpact: BallImpactEvent | null;
};

export function transformMatchStateForPeer(
  state: MatchStateMessage,
): MatchStateMessage {
  return {
    ...state,
    ball: {
      ...state.ball,
      position: { x: state.ball.position.x, y: 1 - state.ball.position.y },
      velocity: { x: state.ball.velocity.x, y: -state.ball.velocity.y },
    },
    paddle: {
      ...state.paddle,
      id: 'top',
      centerY: 1 - state.paddle.centerY,
    },
    match: mirrorMatch(state.match),
    lastImpact: state.lastImpact
      ? {
          ...state.lastImpact,
          playerId: mirrorPlayer(state.lastImpact.playerId),
          normal: {
            x: state.lastImpact.normal.x,
            y: -state.lastImpact.normal.y,
          },
        }
      : null,
  };
}

export function parseMatchStateRequestMessage(
  value: Record<string, unknown>,
): MatchStateRequestMessage | null {
  return value.type === 'match-state-request' &&
    isNonNegativeInteger(value.id) &&
    isOnlineSessionRole(value.playerRole)
    ? {
        type: value.type,
        id: value.id,
        playerRole: value.playerRole,
      }
    : null;
}

export function parseMatchStateMessage(
  value: Record<string, unknown>,
): MatchStateMessage | null {
  if (
    value.type !== 'match-state' ||
    !isNonNegativeInteger(value.requestId) ||
    !isOnlineSessionRole(value.playerRole) ||
    !isNonNegativeInteger(value.tick)
  ) {
    return null;
  }

  const authority = parseAuthority(value.authority);
  const ball = parseBall(value.ball);
  const paddle = parsePaddle(value.paddle);
  const match = parseMatch(value.match);
  const lastImpact = parseImpact(value.lastImpact);

  if (
    !authority ||
    !ball ||
    !paddle ||
    !match ||
    (value.lastImpact !== null && !lastImpact)
  ) {
    return null;
  }

  return {
    type: value.type,
    requestId: value.requestId,
    playerRole: value.playerRole,
    tick: value.tick,
    authority,
    ball,
    paddle,
    match,
    lastImpact,
  };
}

function mirrorMatch(match: MatchState): MatchState {
  return {
    ...match,
    score: { top: match.score.bottom, bottom: match.score.top },
    phase: mirrorPhase(match.phase),
  };
}

function mirrorPhase(phase: MatchPhase): MatchPhase {
  switch (phase.type) {
    case 'playing':
      return phase;
    case 'countdown':
      return {
        ...phase,
        serveToward: mirrorPlayer(phase.serveToward) ?? phase.serveToward,
      };
    case 'point-scored':
      return {
        ...phase,
        scorer: mirrorPlayer(phase.scorer) ?? phase.scorer,
        concededBy: mirrorPlayer(phase.concededBy) ?? phase.concededBy,
      };
    case 'match-ended':
      return {
        ...phase,
        winner: mirrorPlayer(phase.winner) ?? phase.winner,
      };
  }
}

function mirrorPlayer(playerId: PlayerId | null): PlayerId | null {
  if (playerId === null) {
    return null;
  }

  return playerId === 'top' ? 'bottom' : 'top';
}

function parseAuthority(value: unknown): RallyAuthorityState | null {
  if (
    !isRecord(value) ||
    (value.status !== 'waiting-for-serve' && value.status !== 'playing') ||
    !isNonNegativeInteger(value.rallyId) ||
    !isNonNegativeInteger(value.shot) ||
    (value.defenderRole !== null && !isOnlineSessionRole(value.defenderRole)) ||
    (value.nextServerRole !== null &&
      !isOnlineSessionRole(value.nextServerRole))
  ) {
    return null;
  }

  const hasValidRoles =
    value.status === 'playing'
      ? value.defenderRole !== null && value.nextServerRole === null
      : value.defenderRole === null && value.nextServerRole !== null;

  return hasValidRoles
    ? {
        status: value.status,
        rallyId: value.rallyId,
        shot: value.shot,
        defenderRole: value.defenderRole,
        nextServerRole: value.nextServerRole,
      }
    : null;
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
    position.x < -0.25 ||
    position.x > 1.25 ||
    position.y < -0.25 ||
    position.y > 1.25
  ) {
    return null;
  }

  return { id: value.id, position, velocity };
}

function parsePaddle(value: unknown): PaddleState | null {
  if (
    !isRecord(value) ||
    (value.id !== 'top' && value.id !== 'bottom') ||
    !isUnitNumber(value.centerX) ||
    !isUnitNumber(value.centerY) ||
    !isFiniteNumber(value.width) ||
    value.width <= 0 ||
    value.width > 1 ||
    !isFiniteNumber(value.height) ||
    value.height <= 0 ||
    value.height > 1 ||
    !isFiniteNumber(value.velocityX)
  ) {
    return null;
  }

  return {
    id: value.id,
    centerX: value.centerX,
    centerY: value.centerY,
    width: value.width,
    height: value.height,
    velocityX: value.velocityX,
  };
}

function parseMatch(value: unknown): MatchState | null {
  if (
    !isRecord(value) ||
    !isRecord(value.score) ||
    !isNonNegativeInteger(value.score.top) ||
    !isNonNegativeInteger(value.score.bottom) ||
    !isPositiveInteger(value.winningScore) ||
    (value.rallyStartedAtTick !== null &&
      !isNonNegativeInteger(value.rallyStartedAtTick))
  ) {
    return null;
  }

  const phase = parsePhase(value.phase);

  return phase
    ? {
        phase,
        score: { top: value.score.top, bottom: value.score.bottom },
        winningScore: value.winningScore,
        rallyStartedAtTick: value.rallyStartedAtTick,
      }
    : null;
}

function parsePhase(value: unknown): MatchPhase | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  if (value.type === 'playing') {
    return { type: value.type };
  }

  if (
    value.type === 'countdown' &&
    isNonNegativeInteger(value.startedAtTick) &&
    isNonNegativeInteger(value.endsAtTick) &&
    isPositiveInteger(value.countFrom) &&
    isPositiveInteger(value.stepDurationTicks) &&
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

  return normal
    ? {
        type: value.type,
        ballId: value.ballId,
        surface: value.surface,
        playerId: value.playerId,
        normal,
        intensity: value.intensity,
        tick: value.tick,
      }
    : null;
}

function parseVector(value: unknown) {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
    ? { x: value.x, y: value.y }
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOnlineSessionRole(value: unknown): value is OnlineSessionRole {
  return value === 'host' || value === 'guest';
}

function isPlayerId(value: unknown): value is PlayerId {
  return value === 'top' || value === 'bottom';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isUnitNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}
