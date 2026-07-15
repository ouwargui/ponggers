import { useEffect } from 'react';

import type { GameSessionDefinition } from '@/game/session/definition';
import type { RallyEventMessage } from '@/game/session/rally';
import type { SessionTransport } from '@/game/session/transport';

type UseOnlineRallyEventsOptions = {
  session: GameSessionDefinition;
  transport?: SessionTransport;
  onEvent: (event: RallyEventMessage) => void;
};

export function useOnlineRallyEvents({
  session,
  transport,
  onEvent,
}: UseOnlineRallyEventsOptions) {
  useEffect(() => {
    if (session.mode !== 'online-multiplayer' || !transport) {
      return;
    }

    return transport.subscribe((message) => {
      if (
        message.type === 'rally-started' ||
        message.type === 'shot-returned' ||
        message.type === 'point-conceded'
      ) {
        onEvent(message);
      }
    });
  }, [onEvent, session.mode, transport]);
}
