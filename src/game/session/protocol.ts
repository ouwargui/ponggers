import type { PaddleInput } from '@/game/engine/types';
import {
  type GameSnapshotMessage,
  parseGameSnapshotMessage,
} from '@/game/session/snapshot';

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

export type SessionMessage =
  | PaddleInput
  | PingMessage
  | PongMessage
  | RematchRequestMessage
  | GameSnapshotMessage;

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

  if (message.type === 'game-snapshot') {
    return parseGameSnapshotMessage(message);
  }

  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}
