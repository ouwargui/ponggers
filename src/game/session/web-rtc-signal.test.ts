import { describe, expect, test } from 'bun:test';

import {
  decodeWebRtcSignal,
  encodeWebRtcSignal,
  WEB_RTC_SIGNAL_VERSION,
} from '@/game/session/web-rtc-signal';

describe('WebRTC manual signaling', () => {
  test('round-trips an offer', () => {
    const description = { type: 'offer' as const, sdp: 'offer-sdp' };

    expect(decodeWebRtcSignal(encodeWebRtcSignal(description))).toEqual({
      version: WEB_RTC_SIGNAL_VERSION,
      description,
    });
  });

  test('rejects the wrong expected description type', () => {
    const answer = encodeWebRtcSignal({
      type: 'answer',
      sdp: 'answer-sdp',
    });

    expect(decodeWebRtcSignal(answer, 'offer')).toBeNull();
  });

  test('rejects malformed and incompatible signals', () => {
    expect(decodeWebRtcSignal('not-json')).toBeNull();
    expect(
      decodeWebRtcSignal(
        JSON.stringify({
          version: WEB_RTC_SIGNAL_VERSION + 1,
          description: { type: 'offer', sdp: 'offer-sdp' },
        }),
      ),
    ).toBeNull();
    expect(
      decodeWebRtcSignal(
        JSON.stringify({
          version: WEB_RTC_SIGNAL_VERSION,
          description: { type: 'offer', sdp: '' },
        }),
      ),
    ).toBeNull();
  });
});
