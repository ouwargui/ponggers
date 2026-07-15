import { describe, expect, test } from 'bun:test';

import { respondToPing, smoothLatency } from '@/game/session/latency';
import type { SessionMessage } from '@/game/session/protocol';
import type { SessionTransport } from '@/game/session/transport';

describe('session latency', () => {
  test('uses the first round-trip sample immediately', () => {
    expect(smoothLatency(null, 80)).toBe(80);
  });

  test('smooths later samples to avoid a flickering label', () => {
    expect(smoothLatency(80, 180)).toBe(100);
  });

  test('ignores invalid latency samples', () => {
    expect(smoothLatency(80, -1)).toBe(80);
    expect(smoothLatency(80, Number.NaN)).toBe(80);
  });

  test('responds to ping control messages with the same id', () => {
    const sent: SessionMessage[] = [];
    const transport: SessionTransport = {
      state: 'open',
      send(message) {
        sent.push(message);
        return true;
      },
      subscribe() {
        return () => {};
      },
      subscribeState() {
        return () => {};
      },
      close() {},
    };

    expect(respondToPing(transport, { type: 'ping', id: 7 })).toBe(true);
    expect(sent).toEqual([{ type: 'pong', id: 7 }]);
    expect(respondToPing(transport, { type: 'pong', id: 7 })).toBe(false);
  });
});
