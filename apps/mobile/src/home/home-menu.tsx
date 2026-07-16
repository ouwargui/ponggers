import { GameMenu, GameMenuButton } from '@/menu/game-menu';

export function HomeMenu() {
  return (
    <GameMenu>
      <GameMenuButton
        href="/solo"
        label="SOLO"
        accessibilityHint="Choose a difficulty for a solo match against the computer"
      />
      <GameMenuButton
        href="/game/local"
        label="LOCAL MATCH"
        accessibilityHint="Starts a match for two players sharing this device"
      />
      <GameMenuButton
        href="/online"
        label="ONLINE MATCH"
        accessibilityHint="Create or join an online peer-to-peer match"
      />
      <GameMenuButton
        label="SETTINGS"
        accessibilityHint="Settings are coming soon"
      />
    </GameMenu>
  );
}
