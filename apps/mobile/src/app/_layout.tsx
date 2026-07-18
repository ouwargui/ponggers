import { useRouter } from 'expo-router';
import {
  DarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router/react-navigation';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
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
import {
  GameThemeProvider,
  useGameTheme,
} from '@/game/themes/game-theme-provider';
import { defaultGameTheme } from '@/game/themes/theme-registry';
import {
  GamePreferencesProvider,
  useGamePreferences,
} from '@/settings/game-preferences-provider';

function AppContent() {
  const router = useRouter();
  const { palette } = useGameTheme();
  const { clearPreferencesStorage } = useGamePreferences();
  const [activeLab, setActiveLab] = useState<GameDevLab | null>(null);
  const navigationTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: palette.arena,
        border: 'transparent',
        card: palette.arena,
        notification: palette.players.top.glow,
        primary: palette.players.bottom.glow,
        text: palette.ball.core,
      },
    }),
    [palette],
  );
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
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          animation: 'fade',
          contentStyle: { backgroundColor: palette.arena },
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
    </NavigationThemeProvider>
  );
}

function ThemedRootLayout() {
  const { palette } = useGameTheme();

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: palette.arena }]}
    >
      <GamePreferencesProvider>
        <GameCenterProvider>
          <AppContent />
        </GameCenterProvider>
      </GamePreferencesProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <GameThemeProvider theme={defaultGameTheme}>
      <ThemedRootLayout />
    </GameThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
