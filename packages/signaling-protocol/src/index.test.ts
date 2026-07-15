import { describe, expect, test } from 'bun:test';

import {
  decodeClientSignalingMessage,
  decodeServerSignalingMessage,
  normalizeRoomCode,
} from '@ponggers/signaling-protocol';

describe('signaling protocol', () => {
  test('normalizes and validates room joins', () => {
    expect(normalizeRoomCode(' abcd23 ')).toBe('ABCD23');
    expect(
      decodeClientSignalingMessage(
        JSON.stringify({ type: 'join-room', roomCode: ' abcd23 ' }),
      ),
    ).toEqual({ type: 'join-room', roomCode: 'ABCD23' });
    expect(
      decodeClientSignalingMessage(
        JSON.stringify({ type: 'join-room', roomCode: 'bad' }),
      ),
    ).toBeNull();
  });

  test('round-trips signaling relay messages', () => {
    expect(
      decodeClientSignalingMessage(
        JSON.stringify({ type: 'signal', signal: 'rtc-offer' }),
      ),
    ).toEqual({ type: 'signal', signal: 'rtc-offer' });
    expect(
      decodeServerSignalingMessage(
        JSON.stringify({ type: 'signal', signal: 'rtc-answer' }),
      ),
    ).toEqual({ type: 'signal', signal: 'rtc-answer' });
  });

  test('validates server-issued ICE configuration', () => {
    expect(
      decodeServerSignalingMessage(
        JSON.stringify({
          type: 'session-config',
          expiresAt: 2_000_000_000,
          iceServers: [
            { urls: ['stun:stun.example.com:3478'] },
            {
              urls: [
                'turn:turn.example.com:3478?transport=udp',
                'turns:turn.example.com:5349?transport=tcp',
              ],
              username: '2000000000:player',
              credential: 'temporary-credential',
            },
          ],
        }),
      ),
    ).toEqual({
      type: 'session-config',
      expiresAt: 2_000_000_000,
      iceServers: [
        { urls: ['stun:stun.example.com:3478'] },
        {
          urls: [
            'turn:turn.example.com:3478?transport=udp',
            'turns:turn.example.com:5349?transport=tcp',
          ],
          username: '2000000000:player',
          credential: 'temporary-credential',
        },
      ],
    });

    expect(
      decodeServerSignalingMessage(
        JSON.stringify({
          type: 'session-config',
          expiresAt: null,
          iceServers: [{ urls: ['https://not-an-ice-server.example'] }],
        }),
      ),
    ).toBeNull();
  });

  test('rejects unknown messages', () => {
    expect(decodeClientSignalingMessage('{"type":"destroy-room"}')).toBeNull();
    expect(decodeServerSignalingMessage('not-json')).toBeNull();
  });
});
