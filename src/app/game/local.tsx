import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { GameScreen } from '@/game/game-screen';
import { LOCAL_MULTIPLAYER_SESSION } from '@/game/session/definition';

export default function LocalGameScreen() {
  const router = useRouter();
  const quitMatch = useCallback(() => {
    router.replace('/');
  }, [router]);

  return <GameScreen session={LOCAL_MULTIPLAYER_SESSION} onQuit={quitMatch} />;
}
