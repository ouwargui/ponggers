import { useEffect } from 'react';

import {
  createGameSnapshotInbox,
  type GameSnapshotMessage,
} from '@/game/session/snapshot';
import type { SessionTransport } from '@/game/session/transport';

type UseAuthoritativeSnapshotsOptions = {
  enabled: boolean;
  transport?: SessionTransport;
  onSnapshot: (snapshot: GameSnapshotMessage) => void;
};

export function useAuthoritativeSnapshots({
  enabled,
  transport,
  onSnapshot,
}: UseAuthoritativeSnapshotsOptions) {
  useEffect(() => {
    if (!enabled || !transport) {
      return;
    }

    const inbox = createGameSnapshotInbox();

    return transport.subscribe((message) => {
      if (message.type !== 'game-snapshot') {
        return;
      }

      const snapshot = inbox.receive(message);

      if (snapshot) {
        onSnapshot(snapshot);
      }
    });
  }, [enabled, onSnapshot, transport]);
}
