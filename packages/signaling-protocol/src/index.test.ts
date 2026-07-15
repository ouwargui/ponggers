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

  test('rejects unknown messages', () => {
    expect(decodeClientSignalingMessage('{"type":"destroy-room"}')).toBeNull();
    expect(decodeServerSignalingMessage('not-json')).toBeNull();
  });
});
