import type { PaddleInput } from '@/game/engine/types';

export type SessionMessage = PaddleInput;

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

  if (
    message.type !== 'paddle-input' ||
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}
