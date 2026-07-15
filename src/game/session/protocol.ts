import type { PaddleInput } from '@/game/engine/types';

export type PingMessage = {
  type: 'ping';
  id: number;
};

export type PongMessage = {
  type: 'pong';
  id: number;
};

export type SessionMessage = PaddleInput | PingMessage | PongMessage;

export function cloneSessionMessage(message: SessionMessage): SessionMessage {
  return { ...message };
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

  if (message.type === 'ping' || message.type === 'pong') {
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

  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}
