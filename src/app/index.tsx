import { StatusBar } from 'expo-status-bar';

import { GameScreen } from '@/game/game-screen';

export default function HomeScreen() {
  return (
    <>
      <StatusBar hidden />
      <GameScreen />
    </>
  );
}
