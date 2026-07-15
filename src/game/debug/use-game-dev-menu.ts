import * as DevClient from 'expo-dev-client';
import { useEffect } from 'react';

import type { OnlineSessionRole } from '@/game/session/definition';

type UseGameDevMenuOptions = {
  networkLabRole: OnlineSessionRole | null;
  onOpenNetworkLab: (role: OnlineSessionRole) => void;
  onExitNetworkLab: () => void;
};

export function useGameDevMenu({
  networkLabRole,
  onOpenNetworkLab,
  onExitNetworkLab,
}: UseGameDevMenuOptions) {
  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    void DevClient.registerDevMenuItems(
      networkLabRole
        ? [
            {
              name: 'Exit Network Lab',
              callback: onExitNetworkLab,
              shouldCollapse: true,
            },
          ]
        : [
            {
              name: 'Open Network Lab as Host',
              callback: () => onOpenNetworkLab('host'),
              shouldCollapse: true,
            },
            {
              name: 'Open Network Lab as Guest',
              callback: () => onOpenNetworkLab('guest'),
              shouldCollapse: true,
            },
          ],
    );
  }, [networkLabRole, onExitNetworkLab, onOpenNetworkLab]);
}
