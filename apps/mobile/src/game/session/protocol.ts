import type { PaddleInput, PlayerId } from '@/game/engine/types';
import {
  parseRallyEventMessage,
  type RallyEventMessage,
} from '@/game/session/rally';
import {
  type MatchStateMessage,
  type MatchStateRequestMessage,
  parseMatchStateMessage,
  parseMatchStateRequestMessage,
} from '@/game/session/recovery';

export type PingMessage = {
  type: 'ping';
  id: number;
};

export type PongMessage = {
  type: 'pong';
  id: number;
};

export type RematchRequestMessage = {
  type: 'rematch-request';
  id: number;
};

export type PaddleLayoutMessage = {
  type: 'paddle-layout';
  playerId: PlayerId;
  centerY: number;
  height: number;
};

export type SessionMessage =
  | PaddleInput
  | PingMessage
  | PongMessage
  | RematchRequestMessage
  | PaddleLayoutMessage
  | RallyEventMessage
  | MatchStateRequestMessage
  | MatchStateMessage;

export function cloneSessionMessage(message: SessionMessage): SessionMessage {
  const clone = decodeSessionMessage(encodeSessionMessage(message));

  if (!clone) {
    throw new Error('Cannot clone an invalid session message');
  }

  return clone;
}

export function encodeSessionMessage(message: SessionMessage): string {
  return JSON.stringify(message);
}

export function decodeSessionMessage(payload: string): SessionMessage | null {
  try {
    return parseSessionMessage(JSON.parse(payload));
  } catch {
    return null;
  }
}

export function parseSessionMessage(value: unknown): SessionMessage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const message = value as Record<string, unknown>;

  if (
    message.type === 'ping' ||
    message.type === 'pong' ||
    message.type === 'rematch-request'
  ) {
    return isNonNegativeInteger(message.id)
      ? { type: message.type, id: message.id }
      : null;
  }

  if (message.type === 'paddle-input') {
    if (
      (message.playerId !== 'top' && message.playerId !== 'bottom') ||
      !isNonNegativeInteger(message.sequence) ||
      !isFiniteNumber(message.centerX) ||
      !isFiniteNumber(message.velocityX) ||
      !isNonNegativeInteger(message.clientTick)
    ) {
      return null;
    }

    return {
      type: message.type,
      playerId: message.playerId,
      sequence: message.sequence,
      centerX: message.centerX,
      velocityX: message.velocityX,
      clientTick: message.clientTick,
    };
  }

  if (message.type === 'paddle-layout') {
    if (
      (message.playerId !== 'top' && message.playerId !== 'bottom') ||
      !isUnitNumber(message.centerY) ||
      !isFiniteNumber(message.height) ||
      message.height <= 0 ||
      message.height > 1
    ) {
      return null;
    }

    return {
      type: message.type,
      playerId: message.playerId,
      centerY: message.centerY,
      height: message.height,
    };
  }

  if (
    message.type === 'rally-started' ||
    message.type === 'shot-returned' ||
    message.type === 'point-conceded'
  ) {
    return parseRallyEventMessage(message);
  }

  if (message.type === 'match-state-request') {
    return parseMatchStateRequestMessage(message);
  }

  if (message.type === 'match-state') {
    return parseMatchStateMessage(message);
  }

  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isUnitNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}
