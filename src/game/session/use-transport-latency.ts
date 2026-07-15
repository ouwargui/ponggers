import { useEffect, useState } from 'react';

import { NETWORK_PING_INTERVAL_MS } from '@/game/constants';
import { respondToPing, smoothLatency } from '@/game/session/latency';
import type { SessionTransport } from '@/game/session/transport';

type PendingPing = {
  id: number;
  sentAt: number;
};

export function useTransportLatency(
  transport: SessionTransport | undefined,
): number | null {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    setLatencyMs(null);

    if (!transport) {
      return;
    }

    let nextPingId = 0;
    let pendingPing: PendingPing | null = null;
    let smoothedLatencyMs: number | null = null;

    const unsubscribe = transport.subscribe((message) => {
      if (message.type === 'ping') {
        respondToPing(transport, message);
        return;
      }

      if (
        message.type !== 'pong' ||
        pendingPing === null ||
        message.id !== pendingPing.id
      ) {
        return;
      }

      const sampleLatencyMs = performance.now() - pendingPing.sentAt;
      pendingPing = null;
      smoothedLatencyMs = smoothLatency(smoothedLatencyMs, sampleLatencyMs);
      setLatencyMs(smoothedLatencyMs);
    });

    const sendPing = () => {
      nextPingId += 1;
      const sentAt = performance.now();
      pendingPing = null;

      if (transport.send({ type: 'ping', id: nextPingId })) {
        pendingPing = { id: nextPingId, sentAt };
      }
    };

    sendPing();
    const interval = setInterval(sendPing, NETWORK_PING_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [transport]);

  return latencyMs;
}
