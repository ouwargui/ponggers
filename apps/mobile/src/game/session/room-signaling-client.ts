import {
  type ClientSignalingMessage,
  decodeServerSignalingMessage,
  encodeClientSignalingMessage,
  type ServerSignalingMessage,
} from '@ponggers/signaling-protocol';

export type RoomSignalingClientState =
  | 'connecting'
  | 'open'
  | 'closed'
  | 'failed';

type MessageListener = (message: ServerSignalingMessage) => void;
type StateListener = (state: RoomSignalingClientState) => void;
const CONNECTION_TIMEOUT_MS = 8_000;

export class RoomSignalingClient {
  readonly #url: string;
  readonly #messageListeners = new Set<MessageListener>();
  readonly #stateListeners = new Set<StateListener>();
  #socket: WebSocket | null = null;
  #state: RoomSignalingClientState = 'connecting';

  constructor(url: string) {
    this.#url = url;
  }

  get state() {
    return this.#state;
  }

  connect() {
    if (this.#socket) {
      return Promise.reject(new Error('Signaling client is already connected'));
    }

    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.#url);
      this.#socket = socket;
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        this.#transitionTo('failed');
        socket.close();
        reject(new Error('Signaling server connection timed out'));
      }, CONNECTION_TIMEOUT_MS);

      socket.onopen = () => {
        clearTimeout(timeout);
        settled = true;
        this.#transitionTo('open');
        resolve();
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return;
        }

        const message = decodeServerSignalingMessage(event.data);

        if (!message) {
          return;
        }

        for (const listener of this.#messageListeners) {
          listener(message);
        }
      };
      socket.onerror = () => {
        clearTimeout(timeout);
        this.#transitionTo('failed');

        if (!settled) {
          settled = true;
          reject(new Error('Could not connect to the signaling server'));
        }
      };
      socket.onclose = () => {
        clearTimeout(timeout);
        if (this.#state !== 'failed') {
          this.#transitionTo('closed');
        }

        if (!settled) {
          settled = true;
          reject(new Error('Signaling server closed the connection'));
        }
      };
    });
  }

  send(message: ClientSignalingMessage) {
    if (this.#state !== 'open' || this.#socket?.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.#socket.send(encodeClientSignalingMessage(message));
      return true;
    } catch {
      return false;
    }
  }

  subscribe(listener: MessageListener) {
    this.#messageListeners.add(listener);
    return () => this.#messageListeners.delete(listener);
  }

  subscribeState(listener: StateListener) {
    this.#stateListeners.add(listener);
    return () => this.#stateListeners.delete(listener);
  }

  close() {
    if (this.#state === 'open') {
      this.send({ type: 'leave-room' });
    }

    const socket = this.#socket;
    this.#socket = null;

    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, 'Client closed');
    }

    this.#transitionTo('closed');
    this.#messageListeners.clear();
    this.#stateListeners.clear();
  }

  #transitionTo(state: RoomSignalingClientState) {
    if (state === this.#state || this.#state === 'closed') {
      return;
    }

    this.#state = state;

    for (const listener of this.#stateListeners) {
      listener(state);
    }
  }
}
