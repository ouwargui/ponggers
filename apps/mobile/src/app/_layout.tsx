import { useRouter } from 'expo-router';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GameCenterProvider } from '@/achievements/game-center-provider';
import { NetworkLab } from '@/game/debug/network-lab';
import { RtcLab } from '@/game/debug/rtc-lab';
import {
  type GameDevLab,
  useGameDevMenu,
} from '@/game/debug/use-game-dev-menu';
import type { OnlineSessionRole } from '@/game/session/definition';
import { GameThemeProvider } from '@/game/themes/game-theme-provider';
import { defaultGameTheme } from '@/game/themes/theme-registry';
import {
  GamePreferencesProvider,
  useGamePreferences,
} from '@/settings/game-preferences-provider';

function AppContent() {
  const router = useRouter();
  const { clearPreferencesStorage } = useGamePreferences();
  const [activeLab, setActiveLab] = useState<GameDevLab | null>(null);
  const openEnvironment = useCallback(() => {
    router.replace('/development/environment');
  }, [router]);
  const openNetworkLab = useCallback((role: OnlineSessionRole) => {
    setActiveLab({ type: 'network', role });
  }, []);
  const openRtcLab = useCallback((role: OnlineSessionRole) => {
    setActiveLab({ type: 'rtc', role });
  }, []);
  const exitLab = useCallback(() => {
    setActiveLab(null);
  }, []);

  useGameDevMenu({
    activeLab,
    onOpenEnvironment: openEnvironment,
    onOpenNetworkLab: openNetworkLab,
    onOpenRtcLab: openRtcLab,
    onClearPreferencesStorage: clearPreferencesStorage,
    onExitLab: exitLab,
  });

  return (
    <GameThemeProvider theme={defaultGameTheme}>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          animation: 'fade',
          contentStyle: styles.screen,
          gestureEnabled: false,
          headerShown: false,
        }}
      >
        <Stack.Screen name="(menu)" options={{ animation: 'none' }} />
        <Stack.Screen name="development/environment" />
        <Stack.Screen name="game" />
      </Stack>

      {__DEV__ && activeLab ? (
        <View style={styles.debugLab}>
          {activeLab.type === 'network' ? (
            <NetworkLab role={activeLab.role} onExit={exitLab} />
          ) : (
            <RtcLab role={activeLab.role} onExit={exitLab} />
          )}
        </View>
      ) : null}
    </GameThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GamePreferencesProvider>
        <GameCenterProvider>
          <AppContent />
        </GameCenterProvider>
      </GamePreferencesProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: defaultGameTheme.palette.arena,
  },
  debugLab: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
  },
});
