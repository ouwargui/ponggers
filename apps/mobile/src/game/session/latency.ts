import { NETWORK_LATENCY_SMOOTHING_FACTOR } from '@/game/constants';
import type { SessionMessage } from '@/game/session/protocol';
import type { SessionTransport } from '@/game/session/transport';

export function smoothLatency(
  previousLatencyMs: number | null,
  sampleLatencyMs: number,
): number | null {
  if (!Number.isFinite(sampleLatencyMs) || sampleLatencyMs < 0) {
    return previousLatencyMs;
  }

  if (previousLatencyMs === null) {
    return sampleLatencyMs;
  }

  return (
    previousLatencyMs * (1 - NETWORK_LATENCY_SMOOTHING_FACTOR) +
    sampleLatencyMs * NETWORK_LATENCY_SMOOTHING_FACTOR
  );
}

export function respondToPing(
  transport: SessionTransport,
  message: SessionMessage,
): boolean {
  if (message.type !== 'ping') {
    return false;
  }

  return transport.send({ type: 'pong', id: message.id });
}
