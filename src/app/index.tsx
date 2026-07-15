import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';

import { NetworkLab } from '@/game/debug/network-lab';
import { useGameDevMenu } from '@/game/debug/use-game-dev-menu';
import { GameScreen } from '@/game/game-screen';
import type { OnlineSessionRole } from '@/game/session/definition';

export default function HomeScreen() {
  const [networkLabRole, setNetworkLabRole] =
    useState<OnlineSessionRole | null>(null);
  const openNetworkLab = useCallback((role: OnlineSessionRole) => {
    setNetworkLabRole(role);
  }, []);
  const exitNetworkLab = useCallback(() => {
    setNetworkLabRole(null);
  }, []);
  useGameDevMenu({
    networkLabRole,
    onOpenNetworkLab: openNetworkLab,
    onExitNetworkLab: exitNetworkLab,
  });

  if (__DEV__ && networkLabRole) {
    return (
      <>
        <StatusBar hidden />
        <NetworkLab role={networkLabRole} />
      </>
    );
  }

  return (
    <>
      <StatusBar hidden />
      <GameScreen />
    </>
  );
}
