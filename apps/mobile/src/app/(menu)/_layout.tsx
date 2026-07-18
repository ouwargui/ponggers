import Stack from 'expo-router/stack';

import { useGameTheme } from '@/game/themes/game-theme-provider';

export const unstable_settings = {
  anchor: 'index',
};

export default function MenuLayout() {
  const { palette } = useGameTheme();

  return (
    <Stack
      screenOptions={{
        animation: 'default',
        contentStyle: { backgroundColor: palette.arena },
        gestureEnabled: true,
        headerBackButtonDisplayMode: 'minimal',
        headerBlurEffect: 'none',
        headerShadowVisible: false,
        headerTintColor: palette.players.bottom.glow,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          color: palette.players.bottom.glow,
          fontSize: 13,
          fontWeight: '900',
        },
        headerTransparent: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="solo" options={{ title: 'DIFFICULTY' }} />
      <Stack.Screen name="online" options={{ title: 'ONLINE MATCH' }} />
      <Stack.Screen name="achievements" options={{ title: 'ACHIEVEMENTS' }} />
      <Stack.Screen name="themes" options={{ title: 'THEMES' }} />
      <Stack.Screen name="settings" options={{ title: 'SETTINGS' }} />
    </Stack>
  );
}
