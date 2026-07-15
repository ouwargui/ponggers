import { describe, expect, test } from 'bun:test';
import {
  encodeClientSignalingMessage,
  type ServerSignalingMessage,
} from '@ponggers/signaling-protocol';

import { type SignalingClient, SignalingHub } from './signaling-hub';

class FakeClient implements SignalingClient {
  readonly messages: ServerSignalingMessage[] = [];

  constructor(readonly id: string) {}

  send(message: ServerSignalingMessage) {
    this.messages.push(message);
  }
}

describe('signaling hub', () => {
  test('creates, joins, and relays an RTC signal', () => {
    const hub = new SignalingHub({ createRoomCode: () => 'PONG23' });
    const host = new FakeClient('host');
    const guest = new FakeClient('guest');

    hub.handle(host, encodeClientSignalingMessage({ type: 'create-room' }));
    hub.handle(
      guest,
      encodeClientSignalingMessage({ type: 'join-room', roomCode: 'PONG23' }),
    );
    hub.handle(
      host,
      encodeClientSignalingMessage({ type: 'signal', signal: 'rtc-offer' }),
    );

    expect(host.messages).toEqual([
      { type: 'room-created', roomCode: 'PONG23' },
      { type: 'peer-joined' },
    ]);
    expect(guest.messages).toEqual([
      { type: 'room-joined', roomCode: 'PONG23' },
      { type: 'signal', signal: 'rtc-offer' },
    ]);
  });

  test('removes the room and notifies the opponent on disconnect', () => {
    const hub = new SignalingHub({ createRoomCode: () => 'PONG23' });
    const host = new FakeClient('host');
    const guest = new FakeClient('guest');

    hub.handle(host, '{"type":"create-room"}');
    hub.handle(guest, '{"type":"join-room","roomCode":"PONG23"}');
    hub.disconnect(guest);

    expect(host.messages.at(-1)).toEqual({ type: 'peer-left' });

    const replacement = new FakeClient('replacement');
    hub.handle(replacement, '{"type":"join-room","roomCode":"PONG23"}');
    expect(replacement.messages).toEqual([
      { type: 'error', code: 'ROOM_NOT_FOUND', message: 'Room not found' },
    ]);
  });

  test('rejects invalid messages and missing rooms', () => {
    const hub = new SignalingHub();
    const client = new FakeClient('client');

    hub.handle(client, 'not-json');
    hub.handle(client, '{"type":"join-room","roomCode":"NOPE23"}');

    expect(client.messages).toEqual([
      {
        type: 'error',
        code: 'INVALID_MESSAGE',
        message: 'Invalid signaling message',
      },
      { type: 'error', code: 'ROOM_NOT_FOUND', message: 'Room not found' },
    ]);
  });
});
