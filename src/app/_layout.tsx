import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NetworkLab } from '@/game/debug/network-lab';
import { useGameDevMenu } from '@/game/debug/use-game-dev-menu';
import type { OnlineSessionRole } from '@/game/session/definition';
import { GameThemeProvider } from '@/game/themes/game-theme-provider';
import { defaultGameTheme } from '@/game/themes/theme-registry';

export default function RootLayout() {
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GameThemeProvider theme={defaultGameTheme}>
        <StatusBar hidden />
        <Stack
          screenOptions={{ contentStyle: styles.screen, headerShown: false }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="game/local" />
        </Stack>

        {__DEV__ && networkLabRole ? (
          <View style={styles.networkLab}>
            <NetworkLab role={networkLabRole} />
          </View>
        ) : null}
      </GameThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: defaultGameTheme.palette.arena,
  },
  networkLab: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
  },
});
