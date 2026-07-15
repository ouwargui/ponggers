import {
  cloneSessionMessage,
  type SessionMessage,
} from '@/game/session/protocol';
import type {
  SessionMessageListener,
  SessionTransport,
  SessionTransportState,
  SessionTransportStateListener,
} from '@/game/session/transport';

export type TransportScheduler = {
  schedule(delayMs: number, task: () => void): () => void;
};

export type SimulatedTransportOptions = {
  latencyMs?: number;
  jitterMs?: number;
  packetLoss?: number;
  random?: () => number;
  scheduler?: TransportScheduler;
};

export type SimulatedTransportPair = {
  peerA: SessionTransport;
  peerB: SessionTransport;
  close(): void;
};

const systemScheduler: TransportScheduler = {
  schedule(delayMs, task) {
    const timeout = setTimeout(task, delayMs);
    return () => clearTimeout(timeout);
  },
};

class SimulatedTransportEndpoint implements SessionTransport {
  readonly #latencyMs: number;
  readonly #jitterMs: number;
  readonly #packetLoss: number;
  readonly #random: () => number;
  readonly #scheduler: TransportScheduler;
  readonly #messageListeners = new Set<SessionMessageListener>();
  readonly #stateListeners = new Set<SessionTransportStateListener>();
  readonly #pendingDeliveries = new Set<() => void>();
  #peer: SimulatedTransportEndpoint | null = null;
  #state: SessionTransportState = 'open';

  constructor({
    latencyMs = 0,
    jitterMs = 0,
    packetLoss = 0,
    random = Math.random,
    scheduler = systemScheduler,
  }: SimulatedTransportOptions) {
    this.#latencyMs = Math.max(0, latencyMs);
    this.#jitterMs = Math.max(0, jitterMs);
    this.#packetLoss = Math.max(0, Math.min(packetLoss, 1));
    this.#random = random;
    this.#scheduler = scheduler;
  }

  get state() {
    return this.#state;
  }

  connect(peer: SimulatedTransportEndpoint) {
    this.#peer = peer;
  }

  send(message: SessionMessage) {
    const peer = this.#peer;

    if (this.#state !== 'open' || !peer || peer.state !== 'open') {
      return false;
    }

    if (
      message.type === 'paddle-input' &&
      (this.#packetLoss >= 1 ||
        (this.#packetLoss > 0 && this.#sampleRandom() < this.#packetLoss))
    ) {
      return true;
    }

    const jitter =
      this.#jitterMs === 0
        ? 0
        : (this.#sampleRandom() * 2 - 1) * this.#jitterMs;
    const delayMs = Math.max(0, this.#latencyMs + jitter);
    const payload = cloneSessionMessage(message);
    let cancel = () => {};

    cancel = this.#scheduler.schedule(delayMs, () => {
      this.#pendingDeliveries.delete(cancel);

      if (this.#state === 'open' && peer.state === 'open') {
        peer.receive(payload);
      }
    });
    this.#pendingDeliveries.add(cancel);

    return true;
  }

  subscribe(listener: SessionMessageListener) {
    this.#messageListeners.add(listener);
    return () => this.#messageListeners.delete(listener);
  }

  subscribeState(listener: SessionTransportStateListener) {
    this.#stateListeners.add(listener);
    return () => this.#stateListeners.delete(listener);
  }

  close() {
    this.closeConnection();
    this.#peer?.closeConnection();
  }

  private receive(message: SessionMessage) {
    for (const listener of this.#messageListeners) {
      listener(message);
    }
  }

  private closeConnection() {
    if (this.#state === 'closed') {
      return;
    }

    this.#state = 'closed';

    for (const cancel of this.#pendingDeliveries) {
      cancel();
    }

    this.#pendingDeliveries.clear();

    for (const listener of this.#stateListeners) {
      listener(this.#state);
    }

    this.#messageListeners.clear();
    this.#stateListeners.clear();
  }

  #sampleRandom() {
    return Math.max(0, Math.min(this.#random(), 1));
  }
}

export function createSimulatedTransportPair(
  options: SimulatedTransportOptions = {},
): SimulatedTransportPair {
  const peerA = new SimulatedTransportEndpoint(options);
  const peerB = new SimulatedTransportEndpoint(options);

  peerA.connect(peerB);
  peerB.connect(peerA);

  return {
    peerA,
    peerB,
    close() {
      peerA.close();
    },
  };
}
