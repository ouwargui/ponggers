import { describe, expect, test } from 'bun:test';
import { encodeClientSignalingMessage } from '@ponggers/signaling-protocol';

import {
  disconnectSignalingMember,
  expireSignalingRooms,
  getNextRoomExpiration,
  getRoomStats,
  handleSignalingPayload,
  type SignalingMember,
} from './room-coordinator';

const EMPTY_HOST = member('host');
const EMPTY_GUEST = member('guest');

describe('room coordinator', () => {
  test('creates, joins, and relays an RTC signal', () => {
    const created = handleSignalingPayload(
      [EMPTY_HOST, EMPTY_GUEST],
      'host',
      encodeClientSignalingMessage({ type: 'create-room' }),
      { createRoomCode: () => 'PONG23', now: 1_000 },
    );
    const joined = handleSignalingPayload(
      created.members,
      'guest',
      encodeClientSignalingMessage({
        type: 'join-room',
        roomCode: 'PONG23',
      }),
      { now: 2_000 },
    );
    const signaled = handleSignalingPayload(
      joined.members,
      'host',
      encodeClientSignalingMessage({
        type: 'signal',
        signal: 'rtc-offer',
      }),
      { now: 3_000 },
    );

    expect(created.deliveries).toEqual([
      {
        recipientId: 'host',
        message: { type: 'room-created', roomCode: 'PONG23' },
      },
    ]);
    expect(joined.deliveries).toEqual([
      {
        recipientId: 'guest',
        message: { type: 'room-joined', roomCode: 'PONG23' },
      },
      { recipientId: 'host', message: { type: 'peer-joined' } },
    ]);
    expect(signaled.deliveries).toEqual([
      {
        recipientId: 'guest',
        message: { type: 'signal', signal: 'rtc-offer' },
      },
    ]);
    expect(getRoomStats(signaled.members)).toEqual({
      matchedRooms: 1,
      rooms: 1,
      waitingRooms: 0,
    });
  });

  test('removes the room and notifies the opponent on disconnect', () => {
    const matched = matchedMembers();
    const disconnected = disconnectSignalingMember(matched, 'guest');

    expect(disconnected.deliveries).toEqual([
      { recipientId: 'host', message: { type: 'peer-left' } },
    ]);
    expect(disconnected.members).toEqual([member('host'), member('guest')]);
  });

  test('rejects invalid messages and missing rooms', () => {
    const invalid = handleSignalingPayload([EMPTY_HOST], 'host', 'not-json');
    const missing = handleSignalingPayload(
      invalid.members,
      'host',
      '{"type":"join-room","roomCode":"NOPE23"}',
    );

    expect(invalid.deliveries).toEqual([
      {
        recipientId: 'host',
        message: {
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Invalid signaling message',
        },
      },
    ]);
    expect(missing.deliveries).toEqual([
      {
        recipientId: 'host',
        message: {
          type: 'error',
          code: 'ROOM_NOT_FOUND',
          message: 'Room not found',
        },
      },
    ]);
  });

  test('expires rooms and exposes the next alarm timestamp', () => {
    const members = matchedMembers(1_500);

    expect(getNextRoomExpiration(members)).toBe(1_500);

    const expired = expireSignalingRooms(members, 1_501);

    expect(expired.deliveries).toEqual([
      {
        recipientId: 'host',
        message: {
          type: 'error',
          code: 'ROOM_EXPIRED',
          message: 'Room expired',
        },
      },
      {
        recipientId: 'guest',
        message: {
          type: 'error',
          code: 'ROOM_EXPIRED',
          message: 'Room expired',
        },
      },
    ]);
    expect(getNextRoomExpiration(expired.members)).toBeNull();
  });
});

function member(id: string): SignalingMember {
  return {
    id,
    role: null,
    roomCode: null,
    roomExpiresAt: null,
  };
}

function matchedMembers(roomExpiresAt = 60_000): SignalingMember[] {
  return [
    {
      id: 'host',
      role: 'host',
      roomCode: 'PONG23',
      roomExpiresAt,
    },
    {
      id: 'guest',
      role: 'guest',
      roomCode: 'PONG23',
      roomExpiresAt,
    },
  ];
}
