import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GameThemeProvider } from '@/game/themes/game-theme-provider';
import { defaultGameTheme } from '@/game/themes/theme-registry';

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GameThemeProvider theme={defaultGameTheme}>
        <Stack>
          <Stack.Header hidden />
          <Stack.Screen name="index" />
        </Stack>
      </GameThemeProvider>
    </GestureHandlerRootView>
  );
}
