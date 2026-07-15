import type { ServerSignalingMessage } from '@ponggers/signaling-protocol';

import type { OnlineSessionRole } from '@/game/session/definition';
import { RoomSignalingClient } from '@/game/session/room-signaling-client';
import type { SessionTransportState } from '@/game/session/transport';
import { WebRtcSessionPeer } from '@/game/session/web-rtc-peer';

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
  readonly peer: WebRtcSessionPeer;
  readonly #role: OnlineSessionRole;
  readonly #roomCodeToJoin: string | null;
  readonly #signaling: RoomSignalingClient;
  readonly #listeners = new Set<SnapshotListener>();
  #snapshot: OnlineMatchConnectionSnapshot = {
    error: null,
    roomCode: null,
    state: 'connecting',
  };
  #offerSignal: Promise<string> | null = null;
  #hasConnected = false;
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
    this.peer = new WebRtcSessionPeer(role);
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
    this.#unsubscribeTransportState = this.peer.transport.subscribeState(
      this.#handleTransportState,
    );

    try {
      await this.#signaling.connect();

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
    this.#unsubscribeSignalingMessage?.();
    this.#unsubscribeSignalingState?.();
    this.#unsubscribeTransportState?.();
    this.#signaling.close();
    this.peer.close();
    this.#publish({ ...this.#snapshot, state: 'closed' });
    this.#listeners.clear();
  }

  #handleSignalingMessage = (message: ServerSignalingMessage) => {
    void this.#processSignalingMessage(message).catch((error: unknown) => {
      this.#fail(error);
    });
  };

  async #processSignalingMessage(message: ServerSignalingMessage) {
    if (message.type === 'error') {
      throw new Error(message.message);
    }

    if (message.type === 'peer-left') {
      if (!this.#hasConnected) {
        throw new Error('Opponent left the room');
      }
      return;
    }

    if (message.type === 'room-created') {
      this.#publish({
        error: null,
        roomCode: message.roomCode,
        state: 'waiting-for-opponent',
      });
      this.#offerSignal = this.peer.createOfferSignal();
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
      const signal = await this.peer.acceptOfferAndCreateAnswerSignal(
        message.signal,
      );

      if (!this.#signaling.send({ type: 'signal', signal })) {
        throw new Error('Could not send the WebRTC answer');
      }
      return;
    }

    await this.peer.acceptAnswerSignal(message.signal);
  }

  #handleSignalingState = (state: string) => {
    if (state === 'failed' && !this.#hasConnected) {
      this.#fail(new Error('Lost the signaling server connection'));
    }
  };

  #handleTransportState = (state: SessionTransportState) => {
    if (state === 'open') {
      this.#hasConnected = true;
      this.#publish({ ...this.#snapshot, error: null, state: 'connected' });
      return;
    }

    if (state === 'connecting' && this.#hasConnected) {
      this.#publish({ ...this.#snapshot, state: 'reconnecting' });
      return;
    }

    if ((state === 'closed' || state === 'failed') && !this.#closed) {
      this.#fail(new Error('The peer-to-peer connection ended'));
    }
  };

  #fail(error: unknown) {
    if (this.#closed || this.#snapshot.state === 'failed') {
      return;
    }

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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Online connection failed';
}
