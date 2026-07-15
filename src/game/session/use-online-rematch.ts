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
  const isHost =
    session.mode === 'online-multiplayer' && session.onlineRole === 'host';
  const isGuest =
    session.mode === 'online-multiplayer' && session.onlineRole === 'guest';

  useEffect(() => {
    if (!isHost || !transport) {
      return;
    }

    const inbox = createRematchRequestInbox();

    return transport.subscribe((message) => {
      if (message.type === 'rematch-request' && inbox.receive(message)) {
        restartMatch();
      }
    });
  }, [isHost, restartMatch, transport]);

  return useCallback(() => {
    if (isGuest && transport) {
      transport.send({ type: 'rematch-request', id: Date.now() });
      return;
    }

    restartMatch();
  }, [isGuest, restartMatch, transport]);
}
