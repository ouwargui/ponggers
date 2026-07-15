import type { SessionMessage } from '@/game/session/protocol';

export type SessionTransportState = 'connecting' | 'open' | 'closed' | 'failed';

export type SessionMessageListener = (message: SessionMessage) => void;
export type SessionTransportStateListener = (
  state: SessionTransportState,
) => void;

export type SessionTransport = {
  readonly state: SessionTransportState;
  send(message: SessionMessage): boolean;
  subscribe(listener: SessionMessageListener): () => void;
  subscribeState(listener: SessionTransportStateListener): () => void;
  close(): void;
};
