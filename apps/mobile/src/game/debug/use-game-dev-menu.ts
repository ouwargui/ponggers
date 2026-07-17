import * as DevClient from 'expo-dev-client';
import { useEffect } from 'react';

import type { OnlineSessionRole } from '@/game/session/definition';

type UseGameDevMenuOptions = {
  activeLab: GameDevLab | null;
  onOpenEnvironment: () => void;
  onOpenNetworkLab: (role: OnlineSessionRole) => void;
  onOpenRtcLab: (role: OnlineSessionRole) => void;
  onClearPreferencesStorage: () => void;
  onExitLab: () => void;
};

export type GameDevLab = {
  type: 'network' | 'rtc';
  role: OnlineSessionRole;
};

export function useGameDevMenu({
  activeLab,
  onOpenEnvironment,
  onOpenNetworkLab,
  onOpenRtcLab,
  onClearPreferencesStorage,
  onExitLab,
}: UseGameDevMenuOptions) {
  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    void DevClient.registerDevMenuItems(
      activeLab
        ? [
            {
              name: `Exit ${activeLab.type === 'rtc' ? 'RTC' : 'Network'} Lab`,
              callback: onExitLab,
              shouldCollapse: true,
            },
          ]
        : [
            {
              name: 'Open Environment Variables',
              callback: onOpenEnvironment,
              shouldCollapse: true,
            },
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
            {
              name: 'Open RTC Lab as Host',
              callback: () => onOpenRtcLab('host'),
              shouldCollapse: true,
            },
            {
              name: 'Open RTC Lab as Guest',
              callback: () => onOpenRtcLab('guest'),
              shouldCollapse: true,
            },
            {
              name: 'Clear MMKV Preferences',
              callback: onClearPreferencesStorage,
              shouldCollapse: true,
            },
          ],
    );
  }, [
    activeLab,
    onClearPreferencesStorage,
    onExitLab,
    onOpenEnvironment,
    onOpenNetworkLab,
    onOpenRtcLab,
  ]);
}
