import { GameScreen } from '@/game/game-screen';
import { LOCAL_MULTIPLAYER_SESSION } from '@/game/session/definition';

export default function LocalGameScreen() {
  return <GameScreen session={LOCAL_MULTIPLAYER_SESSION} />;
}
