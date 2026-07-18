import Stack from 'expo-router/stack';

import { useGameTheme } from '@/game/themes/game-theme-provider';

export default function GameLayout() {
  const { palette } = useGameTheme();

  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: palette.arena },
        gestureEnabled: false,
        headerShown: false,
      }}
    />
  );
}
