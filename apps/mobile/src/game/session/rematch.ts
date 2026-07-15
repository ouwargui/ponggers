import type { RematchRequestMessage } from '@/game/session/protocol';

export type RematchRequestInbox = {
  receive(message: RematchRequestMessage): boolean;
};

export function createRematchRequestInbox(): RematchRequestInbox {
  let lastRequestId = -1;

  return {
    receive(message) {
      if (message.id <= lastRequestId) {
        return false;
      }

      lastRequestId = message.id;
      return true;
    },
  };
}
