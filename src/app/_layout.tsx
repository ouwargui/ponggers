import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Header hidden />
        <Stack.Screen name="index" />
      </Stack>
    </GestureHandlerRootView>
  );
}
