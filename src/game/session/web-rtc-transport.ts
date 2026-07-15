import {
  decodeSessionMessage,
  encodeSessionMessage,
  type SessionMessage,
} from '@/game/session/protocol';
import type {
  SessionMessageListener,
  SessionTransport,
  SessionTransportState,
  SessionTransportStateListener,
} from '@/game/session/transport';

type SessionDataChannelEvent = {
  data?: unknown;
};

export type SessionDataChannel = {
  readonly label: string;
  readonly readyState: string;
  addEventListener(
    type: 'open' | 'close' | 'error' | 'message',
    listener: (event: SessionDataChannelEvent) => void,
  ): void;
  removeEventListener(
    type: 'open' | 'close' | 'error' | 'message',
    listener: (event: SessionDataChannelEvent) => void,
  ): void;
  send(payload: string): void;
  close(): void;
};

export type SessionDataChannelKind = 'realtime' | 'reliable';

export function getSessionMessageChannel(
  message: SessionMessage,
): SessionDataChannelKind {
  return message.type === 'paddle-input' ? 'realtime' : 'reliable';
}

export class WebRtcSessionTransport implements SessionTransport {
  readonly #messageListeners = new Set<SessionMessageListener>();
  readonly #stateListeners = new Set<SessionTransportStateListener>();
  readonly #channels: Record<
    SessionDataChannelKind,
    SessionDataChannel | null
  > = {
    realtime: null,
    reliable: null,
  };
  readonly #reliableOutbox: string[] = [];
  #state: SessionTransportState = 'connecting';

  get state() {
    return this.#state;
  }

  attachDataChannel(kind: SessionDataChannelKind, channel: SessionDataChannel) {
    if (this.#state === 'closed' || this.#state === 'failed') {
      channel.close();
      return;
    }

    if (this.#channels[kind]) {
      throw new Error(`The WebRTC session already has a ${kind} DataChannel`);
    }

    this.#channels[kind] = channel;
    channel.addEventListener('open', this.#handleChannelStateChange);
    channel.addEventListener('close', this.#handleChannelStateChange);
    channel.addEventListener('error', this.#handleError);
    channel.addEventListener(
      'message',
      kind === 'realtime'
        ? this.#handleRealtimeMessage
        : this.#handleReliableMessage,
    );

    if (channel.readyState === 'open') {
      this.#updateChannelState();
    }
  }

  handlePeerConnectionState(state: string) {
    if (state === 'failed') {
      this.fail();
      return;
    }

    if (state === 'closed') {
      this.#transitionTo('closed');
      return;
    }

    if (state === 'new' || state === 'connecting' || state === 'disconnected') {
      this.#transitionTo('connecting');
      return;
    }

    if (state === 'connected') {
      this.#updateChannelState();
    }
  }

  fail() {
    this.#transitionTo('failed');
  }

  send(message: SessionMessage) {
    const kind = getSessionMessageChannel(message);
    const channel = this.#channels[kind];

    if (
      this.#state === 'closed' ||
      this.#state === 'failed' ||
      !channel ||
      (kind === 'realtime' && this.#state !== 'open')
    ) {
      return false;
    }

    const payload = encodeSessionMessage(message);

    if (channel.readyState !== 'open') {
      return this.#queueReliableMessage(kind, message, payload);
    }

    try {
      channel.send(payload);
      return true;
    } catch {
      return this.#queueReliableMessage(kind, message, payload);
    }
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
    this.#reliableOutbox.length = 0;

    for (const kind of ['realtime', 'reliable'] as const) {
      const channel = this.#channels[kind];

      if (channel) {
        this.#detachDataChannel(kind, channel);
        this.#channels[kind] = null;

        if (channel.readyState !== 'closed') {
          channel.close();
        }
      }
    }

    this.#transitionTo('closed');
    this.#messageListeners.clear();
    this.#stateListeners.clear();
  }

  #handleChannelStateChange = () => {
    this.#updateChannelState();
  };

  #handleError = () => {
    this.fail();
  };

  #handleRealtimeMessage = (event: SessionDataChannelEvent) => {
    this.#handleMessage('realtime', event);
  };

  #handleReliableMessage = (event: SessionDataChannelEvent) => {
    this.#handleMessage('reliable', event);
  };

  #handleMessage = (
    kind: SessionDataChannelKind,
    event: SessionDataChannelEvent,
  ) => {
    if (typeof event.data !== 'string') {
      return;
    }

    const message = decodeSessionMessage(event.data);

    if (!message || getSessionMessageChannel(message) !== kind) {
      return;
    }

    for (const listener of this.#messageListeners) {
      listener(message);
    }
  };

  #detachDataChannel(
    kind: SessionDataChannelKind,
    channel: SessionDataChannel,
  ) {
    channel.removeEventListener('open', this.#handleChannelStateChange);
    channel.removeEventListener('close', this.#handleChannelStateChange);
    channel.removeEventListener('error', this.#handleError);
    channel.removeEventListener(
      'message',
      kind === 'realtime'
        ? this.#handleRealtimeMessage
        : this.#handleReliableMessage,
    );
  }

  #updateChannelState() {
    const realtimeState = this.#channels.realtime?.readyState;
    const reliableState = this.#channels.reliable?.readyState;

    if (realtimeState === 'closed' || reliableState === 'closed') {
      if (this.#state !== 'failed') {
        this.#transitionTo('closed');
      }
      return;
    }

    if (realtimeState === 'open' && reliableState === 'open') {
      if (!this.#flushReliableOutbox()) {
        this.#transitionTo('connecting');
        return;
      }

      this.#transitionTo('open');
      return;
    }

    this.#transitionTo('connecting');
  }

  #queueReliableMessage(
    kind: SessionDataChannelKind,
    message: SessionMessage,
    payload: string,
  ) {
    if (
      kind !== 'reliable' ||
      this.#state !== 'connecting' ||
      message.type === 'ping' ||
      message.type === 'pong'
    ) {
      return false;
    }

    this.#reliableOutbox.push(payload);
    return true;
  }

  #flushReliableOutbox() {
    const channel = this.#channels.reliable;

    if (channel?.readyState !== 'open') {
      return false;
    }

    while (this.#reliableOutbox.length > 0) {
      const payload = this.#reliableOutbox[0];

      try {
        channel.send(payload);
        this.#reliableOutbox.shift();
      } catch {
        return false;
      }
    }

    return true;
  }

  #transitionTo(state: SessionTransportState) {
    if (
      state === this.#state ||
      this.#state === 'closed' ||
      (this.#state === 'failed' && state !== 'closed')
    ) {
      return;
    }

    this.#state = state;

    for (const listener of this.#stateListeners) {
      listener(state);
    }
  }
}
