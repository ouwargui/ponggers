import { useCallback, useEffect } from 'react';

import type { GameSessionDefinition } from '@/game/session/definition';
import { createRematchRequestInbox } from '@/game/session/rematch';
import type { SessionTransport } from '@/game/session/transport';

type UseOnlineRematchOptions = {
  session: GameSessionDefinition;
  transport?: SessionTransport;
  restartMatch: () => void;
};

export function useOnlineRematch({
  session,
  transport,
  restartMatch,
}: UseOnlineRematchOptions) {
  const isOnline = session.mode === 'online-multiplayer';

  useEffect(() => {
    if (!isOnline || !transport) {
      return;
    }

    const inbox = createRematchRequestInbox();

    return transport.subscribe((message) => {
      if (message.type === 'rematch-request' && inbox.receive(message)) {
        restartMatch();
      }
    });
  }, [isOnline, restartMatch, transport]);

  return useCallback(() => {
    if (isOnline && transport) {
      transport.send({ type: 'rematch-request', id: Date.now() });
    }

    restartMatch();
  }, [isOnline, restartMatch, transport]);
}
