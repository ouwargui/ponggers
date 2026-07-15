export const ROOM_CODE_LENGTH = 6;
export const MAX_SIGNAL_LENGTH = 256_000;

export type SignalingRole = 'host' | 'guest';

export type ClientSignalingMessage =
  | { type: 'create-room' }
  | { type: 'join-room'; roomCode: string }
  | { type: 'signal'; signal: string }
  | { type: 'leave-room' };

export type SignalingErrorCode =
  | 'ALREADY_IN_ROOM'
  | 'INVALID_MESSAGE'
  | 'NOT_IN_ROOM'
  | 'PEER_NOT_READY'
  | 'ROOM_FULL'
  | 'ROOM_NOT_FOUND'
  | 'SERVER_FULL';

export type ServerSignalingMessage =
  | { type: 'room-created'; roomCode: string }
  | { type: 'room-joined'; roomCode: string }
  | { type: 'peer-joined' }
  | { type: 'signal'; signal: string }
  | { type: 'peer-left' }
  | { type: 'error'; code: SignalingErrorCode; message: string };

const ROOM_CODE_PATTERN = /^[A-Z2-9]{6}$/;
const SIGNALING_ERROR_CODES = new Set<SignalingErrorCode>([
  'ALREADY_IN_ROOM',
  'INVALID_MESSAGE',
  'NOT_IN_ROOM',
  'PEER_NOT_READY',
  'ROOM_FULL',
  'ROOM_NOT_FOUND',
  'SERVER_FULL',
]);

export function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase();
}

export function isRoomCode(value: unknown): value is string {
  return typeof value === 'string' && ROOM_CODE_PATTERN.test(value);
}

export function encodeClientSignalingMessage(message: ClientSignalingMessage) {
  return JSON.stringify(message);
}

export function encodeServerSignalingMessage(message: ServerSignalingMessage) {
  return JSON.stringify(message);
}

export function decodeClientSignalingMessage(
  payload: string,
): ClientSignalingMessage | null {
  return decodeMessage(payload, parseClientSignalingMessage);
}

export function decodeServerSignalingMessage(
  payload: string,
): ServerSignalingMessage | null {
  return decodeMessage(payload, parseServerSignalingMessage);
}

export function parseClientSignalingMessage(
  value: unknown,
): ClientSignalingMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  if (value.type === 'create-room' || value.type === 'leave-room') {
    return { type: value.type };
  }

  if (value.type === 'join-room' && typeof value.roomCode === 'string') {
    const roomCode = normalizeRoomCode(value.roomCode);
    return isRoomCode(roomCode) ? { type: 'join-room', roomCode } : null;
  }

  if (
    value.type === 'signal' &&
    typeof value.signal === 'string' &&
    value.signal.length > 0 &&
    value.signal.length <= MAX_SIGNAL_LENGTH
  ) {
    return { type: 'signal', signal: value.signal };
  }

  return null;
}

export function parseServerSignalingMessage(
  value: unknown,
): ServerSignalingMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  if (value.type === 'peer-joined' || value.type === 'peer-left') {
    return { type: value.type };
  }

  if (
    (value.type === 'room-created' || value.type === 'room-joined') &&
    isRoomCode(value.roomCode)
  ) {
    return { type: value.type, roomCode: value.roomCode };
  }

  if (
    value.type === 'signal' &&
    typeof value.signal === 'string' &&
    value.signal.length > 0 &&
    value.signal.length <= MAX_SIGNAL_LENGTH
  ) {
    return { type: 'signal', signal: value.signal };
  }

  if (
    value.type === 'error' &&
    typeof value.code === 'string' &&
    SIGNALING_ERROR_CODES.has(value.code as SignalingErrorCode) &&
    typeof value.message === 'string' &&
    value.message.length > 0
  ) {
    return {
      type: 'error',
      code: value.code as SignalingErrorCode,
      message: value.message,
    };
  }

  return null;
}

function decodeMessage<T>(
  payload: string,
  parse: (value: unknown) => T | null,
): T | null {
  try {
    return parse(JSON.parse(payload));
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
