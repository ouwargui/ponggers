import type { BallImpactEvent, BallState, PlayerId } from '@/game/engine/types';
import type { OnlineSessionRole } from '@/game/session/definition';

export type RallyStartedMessage = {
  type: 'rally-started';
  rallyId: number;
  shot: 0;
  playerRole: OnlineSessionRole;
  ball: BallState;
};

export type ShotReturnedMessage = {
  type: 'shot-returned';
  rallyId: number;
  shot: number;
  playerRole: OnlineSessionRole;
  ball: BallState;
  impact: BallImpactEvent;
};

export type PointConcededMessage = {
  type: 'point-conceded';
  rallyId: number;
  shot: number;
  playerRole: OnlineSessionRole;
};

export type RallyEventMessage =
  | RallyStartedMessage
  | ShotReturnedMessage
  | PointConcededMessage;

export type RallyAuthorityState = {
  status: 'waiting-for-serve' | 'playing';
  rallyId: number;
  shot: number;
  defenderRole: OnlineSessionRole | null;
  nextServerRole: OnlineSessionRole | null;
};

export function createInitialRallyAuthority(): RallyAuthorityState {
  'worklet';

  return {
    status: 'waiting-for-serve',
    rallyId: 0,
    shot: 0,
    defenderRole: null,
    nextServerRole: 'host',
  };
}

export function advanceRallyAuthority(
  state: RallyAuthorityState,
  event: RallyEventMessage,
): RallyAuthorityState | null {
  'worklet';

  if (event.type === 'rally-started') {
    if (
      state.status !== 'waiting-for-serve' ||
      event.rallyId !== state.rallyId + 1 ||
      event.shot !== 0 ||
      event.playerRole !== state.nextServerRole
    ) {
      return null;
    }

    return {
      status: 'playing',
      rallyId: event.rallyId,
      shot: 0,
      defenderRole: event.playerRole,
      nextServerRole: null,
    };
  }

  if (
    state.status !== 'playing' ||
    event.rallyId !== state.rallyId ||
    event.playerRole !== state.defenderRole
  ) {
    return null;
  }

  if (event.type === 'shot-returned') {
    if (event.shot !== state.shot + 1) {
      return null;
    }

    return {
      ...state,
      shot: event.shot,
      defenderRole: event.playerRole === 'host' ? 'guest' : 'host',
    };
  }

  if (event.shot !== state.shot) {
    return null;
  }

  return {
    status: 'waiting-for-serve',
    rallyId: state.rallyId,
    shot: state.shot,
    defenderRole: null,
    nextServerRole: event.playerRole,
  };
}

export function transformRallyEventForPeer(
  event: RallyEventMessage,
): RallyEventMessage {
  if (event.type === 'point-conceded') {
    return event;
  }

  const ball = mirrorBall(event.ball);

  if (event.type === 'rally-started') {
    return { ...event, ball };
  }

  return {
    ...event,
    ball,
    impact: {
      ...event.impact,
      playerId: mirrorPlayer(event.impact.playerId),
      normal: {
        x: event.impact.normal.x,
        y: -event.impact.normal.y,
      },
    },
  };
}

export function parseRallyEventMessage(
  value: Record<string, unknown>,
): RallyEventMessage | null {
  if (
    !isNonNegativeInteger(value.rallyId) ||
    !isNonNegativeInteger(value.shot) ||
    !isOnlineSessionRole(value.playerRole)
  ) {
    return null;
  }

  if (value.type === 'point-conceded') {
    return {
      type: value.type,
      rallyId: value.rallyId,
      shot: value.shot,
      playerRole: value.playerRole,
    };
  }

  const ball = parseBall(value.ball);

  if (!ball) {
    return null;
  }

  if (value.type === 'rally-started') {
    return value.shot === 0
      ? {
          type: value.type,
          rallyId: value.rallyId,
          shot: 0,
          playerRole: value.playerRole,
          ball,
        }
      : null;
  }

  if (value.type !== 'shot-returned') {
    return null;
  }

  const impact = parseImpact(value.impact);

  if (
    impact?.surface !== 'paddle' ||
    impact.playerId !== 'bottom' ||
    impact.ballId !== ball.id
  ) {
    return null;
  }

  return {
    type: value.type,
    rallyId: value.rallyId,
    shot: value.shot,
    playerRole: value.playerRole,
    ball,
    impact,
  };
}

function mirrorBall(ball: BallState): BallState {
  return {
    ...ball,
    position: { x: ball.position.x, y: 1 - ball.position.y },
    velocity: { x: ball.velocity.x, y: -ball.velocity.y },
  };
}

function mirrorPlayer(playerId: PlayerId | null): PlayerId | null {
  if (playerId === null) {
    return null;
  }

  return playerId === 'top' ? 'bottom' : 'top';
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

function parseImpact(value: unknown): BallImpactEvent | null {
  if (
    !isRecord(value) ||
    value.type !== 'ball-impact' ||
    typeof value.ballId !== 'string' ||
    (value.surface !== 'paddle' && value.surface !== 'wall') ||
    (value.playerId !== null &&
      value.playerId !== 'top' &&
      value.playerId !== 'bottom') ||
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
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y)
  ) {
    return null;
  }

  return { x: value.x, y: value.y };
}

function isOnlineSessionRole(value: unknown): value is OnlineSessionRole {
  return value === 'host' || value === 'guest';
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
