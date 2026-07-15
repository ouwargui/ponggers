import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { GameSessionDefinition } from '@/game/session/definition';
import type { MatchStateMessage } from '@/game/session/recovery';
import type { SessionTransport } from '@/game/session/transport';

type UseOnlineMatchRecoveryOptions = {
  session: GameSessionDefinition;
  transport?: SessionTransport;
  createMatchState: (requestId: number) => MatchStateMessage | null;
  applyMatchState: (state: MatchStateMessage) => void;
};

export function useOnlineMatchRecovery({
  session,
  transport,
  createMatchState,
  applyMatchState,
}: UseOnlineMatchRecoveryOptions) {
  useEffect(() => {
    const role = session.onlineRole;

    if (session.mode !== 'online-multiplayer' || !role || !transport) {
      return;
    }

    let lastRequestId = Date.now();
    let pendingRequestId: number | null = null;
    let previousTransportState = transport.state;
    let previousAppState = AppState.currentState;

    const getRecoveryRole = () => {
      const state = createMatchState(0);

      return state?.authority.defenderRole ?? state?.authority.nextServerRole;
    };

    const synchronizeMatchState = () => {
      if (transport.state !== 'open') {
        return;
      }

      const recoveryRole = getRecoveryRole();

      if (!recoveryRole) {
        return;
      }

      if (recoveryRole === role) {
        const state = createMatchState(0);

        if (state) {
          transport.send(state);
        }
        return;
      }

      lastRequestId += 1;
      const requestId = lastRequestId;

      if (
        transport.send({
          type: 'match-state-request',
          id: requestId,
          playerRole: role,
        })
      ) {
        pendingRequestId = requestId;
      }
    };

    const unsubscribeMessages = transport.subscribe((message) => {
      if (
        message.type === 'match-state-request' &&
        message.playerRole !== role
      ) {
        const state = createMatchState(message.id);

        if (
          state &&
          (state.authority.defenderRole ?? state.authority.nextServerRole) ===
            role
        ) {
          transport.send(state);
        }
        return;
      }

      if (
        message.type === 'match-state' &&
        message.playerRole !== role &&
        (message.requestId === 0 || message.requestId === pendingRequestId) &&
        message.playerRole === getRecoveryRole()
      ) {
        pendingRequestId = null;
        applyMatchState(message);
      }
    });
    const unsubscribeState = transport.subscribeState((state) => {
      const didReopen = state === 'open' && previousTransportState !== 'open';
      previousTransportState = state;

      if (didReopen) {
        synchronizeMatchState();
      }
    });
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        const didReturnToForeground =
          nextAppState === 'active' && previousAppState !== 'active';
        previousAppState = nextAppState;

        if (didReturnToForeground) {
          synchronizeMatchState();
        }
      },
    );

    if (transport.state === 'open') {
      synchronizeMatchState();
    }

    return () => {
      appStateSubscription.remove();
      unsubscribeMessages();
      unsubscribeState();
    };
  }, [
    applyMatchState,
    createMatchState,
    session.mode,
    session.onlineRole,
    transport,
  ]);
}
