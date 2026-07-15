import type {
  ServerSignalingMessage,
  SessionConfig,
} from '@ponggers/signaling-protocol';

import { publicEnvironment } from '@/config/public-environment';
import type { OnlineSessionRole } from '@/game/session/definition';
import { RoomSignalingClient } from '@/game/session/room-signaling-client';
import type { SessionTransportState } from '@/game/session/transport';
import { WebRtcSessionPeer } from '@/game/session/web-rtc-peer';

const SESSION_CONFIG_TIMEOUT_MS = 8_000;
const RECONNECT_GRACE_MS = 10_000;

export type OnlineMatchConnectionState =
  | 'connecting'
  | 'waiting-for-opponent'
  | 'negotiating'
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'closed';

export type OnlineMatchConnectionSnapshot = {
  error: string | null;
  roomCode: string | null;
  state: OnlineMatchConnectionState;
};

type SnapshotListener = (snapshot: OnlineMatchConnectionSnapshot) => void;

export class OnlineMatchConnection {
  readonly #role: OnlineSessionRole;
  readonly #roomCodeToJoin: string | null;
  readonly #signaling: RoomSignalingClient;
  readonly #listeners = new Set<SnapshotListener>();
  readonly #sessionConfigPromise: Promise<SessionConfig>;
  readonly #resolveSessionConfig: (config: SessionConfig) => void;
  #peer: WebRtcSessionPeer | null = null;
  #snapshot: OnlineMatchConnectionSnapshot = {
    error: null,
    roomCode: null,
    state: 'connecting',
  };
  #offerSignal: Promise<string> | null = null;
  #reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  #hasConnected = false;
  #hasSessionConfig = false;
  #closed = false;
  #unsubscribeSignalingMessage: (() => void) | null = null;
  #unsubscribeSignalingState: (() => void) | null = null;
  #unsubscribeTransportState: (() => void) | null = null;

  constructor({
    role,
    roomCode,
    signalingUrl,
  }: {
    role: OnlineSessionRole;
    roomCode?: string;
    signalingUrl: string;
  }) {
    this.#role = role;
    this.#roomCodeToJoin = roomCode ?? null;
    this.#signaling = new RoomSignalingClient(signalingUrl);

    let resolveSessionConfig: (config: SessionConfig) => void = () => {};
    this.#sessionConfigPromise = new Promise((resolve) => {
      resolveSessionConfig = resolve;
    });
    this.#resolveSessionConfig = resolveSessionConfig;
  }

  get peer() {
    if (!this.#peer) {
      throw new Error('The WebRTC peer has not been configured yet');
    }

    return this.#peer;
  }

  get snapshot() {
    return this.#snapshot;
  }

  subscribe(listener: SnapshotListener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async start() {
    this.#unsubscribeSignalingMessage = this.#signaling.subscribe(
      this.#handleSignalingMessage,
    );
    this.#unsubscribeSignalingState = this.#signaling.subscribeState(
      this.#handleSignalingState,
    );

    try {
      await this.#signaling.connect();
      const sessionConfig = await withTimeout(
        this.#sessionConfigPromise,
        SESSION_CONFIG_TIMEOUT_MS,
        'Signaling server did not provide ICE configuration',
      );

      if (this.#closed) {
        return;
      }

      this.#initializePeer(sessionConfig);

      const sent =
        this.#role === 'host'
          ? this.#signaling.send({ type: 'create-room' })
          : this.#signaling.send({
              type: 'join-room',
              roomCode: this.#roomCodeToJoin ?? '',
            });

      if (!sent) {
        throw new Error('Could not send the room request');
      }
    } catch (error) {
      this.#fail(error);
    }
  }

  close() {
    if (this.#closed) {
      return;
    }

    this.#closed = true;
    this.#clearReconnectTimeout();
    this.#unsubscribeSignalingMessage?.();
    this.#unsubscribeSignalingState?.();
    this.#unsubscribeTransportState?.();
    this.#signaling.close();
    this.#peer?.close();
    this.#publish({ ...this.#snapshot, state: 'closed' });
    this.#listeners.clear();
  }

  #initializePeer(config: SessionConfig) {
    if (this.#peer) {
      throw new Error('The WebRTC peer is already configured');
    }

    const forceTurnRelay = publicEnvironment.forceTurnRelay === 'true';

    if (
      config.expiresAt !== null &&
      config.expiresAt <= Math.floor(Date.now() / 1000) + 30
    ) {
      throw new Error('The server issued expired TURN credentials');
    }

    if (forceTurnRelay && !hasTurnServer(config)) {
      throw new Error(
        'Forced TURN relay requested, but TURN is not configured',
      );
    }

    this.#peer = new WebRtcSessionPeer(this.#role, {
      iceServers: config.iceServers,
      iceTransportPolicy: forceTurnRelay ? 'relay' : 'all',
    });
    this.#unsubscribeTransportState = this.#peer.transport.subscribeState(
      this.#handleTransportState,
    );
  }

  #handleSignalingMessage = (message: ServerSignalingMessage) => {
    if (message.type === 'session-config') {
      if (!this.#hasSessionConfig) {
        this.#hasSessionConfig = true;
        this.#resolveSessionConfig({
          expiresAt: message.expiresAt,
          iceServers: message.iceServers,
        });
      }
      return;
    }

    void this.#processSignalingMessage(message).catch((error: unknown) => {
      this.#fail(error);
    });
  };

  async #processSignalingMessage(
    message: Exclude<ServerSignalingMessage, { type: 'session-config' }>,
  ) {
    if (message.type === 'error') {
      throw new Error(message.message);
    }

    if (message.type === 'peer-left') {
      throw new Error('Opponent left the match');
    }

    const peer = this.peer;

    if (message.type === 'room-created') {
      this.#publish({
        error: null,
        roomCode: message.roomCode,
        state: 'waiting-for-opponent',
      });
      this.#offerSignal = peer.createOfferSignal();
      return;
    }

    if (message.type === 'room-joined') {
      this.#publish({
        error: null,
        roomCode: message.roomCode,
        state: 'negotiating',
      });
      return;
    }

    if (message.type === 'peer-joined') {
      if (this.#role !== 'host' || !this.#offerSignal) {
        throw new Error('Received an unexpected peer join');
      }

      this.#publish({ ...this.#snapshot, state: 'negotiating' });
      const signal = await this.#offerSignal;

      if (!this.#signaling.send({ type: 'signal', signal })) {
        throw new Error('Could not send the WebRTC offer');
      }
      return;
    }

    if (this.#role === 'guest') {
      const signal = await peer.acceptOfferAndCreateAnswerSignal(
        message.signal,
      );

      if (!this.#signaling.send({ type: 'signal', signal })) {
        throw new Error('Could not send the WebRTC answer');
      }
      return;
    }

    await peer.acceptAnswerSignal(message.signal);
  }

  #handleSignalingState = (state: string) => {
    if ((state === 'failed' || state === 'closed') && !this.#hasConnected) {
      this.#fail(new Error('Lost the signaling server connection'));
    }
  };

  #handleTransportState = (state: SessionTransportState) => {
    if (this.#snapshot.state === 'failed' || this.#closed) {
      return;
    }

    if (state === 'open') {
      this.#clearReconnectTimeout();
      this.#hasConnected = true;
      this.#publish({ ...this.#snapshot, error: null, state: 'connected' });
      return;
    }

    if (state === 'connecting' && this.#hasConnected) {
      this.#publish({ ...this.#snapshot, state: 'reconnecting' });

      if (!this.#reconnectTimeout) {
        this.#reconnectTimeout = setTimeout(() => {
          this.#reconnectTimeout = null;
          this.#fail(new Error('Could not reconnect to the opponent'));
        }, RECONNECT_GRACE_MS);
      }
      return;
    }

    if (state === 'closed' || state === 'failed') {
      this.#fail(new Error('The peer-to-peer connection ended'));
    }
  };

  #clearReconnectTimeout() {
    if (this.#reconnectTimeout) {
      clearTimeout(this.#reconnectTimeout);
      this.#reconnectTimeout = null;
    }
  }

  #fail(error: unknown) {
    if (this.#closed || this.#snapshot.state === 'failed') {
      return;
    }

    this.#clearReconnectTimeout();
    this.#publish({
      ...this.#snapshot,
      error: getErrorMessage(error),
      state: 'failed',
    });
  }

  #publish(snapshot: OnlineMatchConnectionSnapshot) {
    this.#snapshot = snapshot;

    for (const listener of this.#listeners) {
      listener(snapshot);
    }
  }
}

function hasTurnServer(config: SessionConfig) {
  return config.iceServers.some((server) =>
    server.urls.some((url) => /^turns?:/i.test(url)),
  );
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    void promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Online connection failed';
}
