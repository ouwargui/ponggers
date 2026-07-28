export type PublicEnvironmentEntry = {
  name: string;
  value: string | undefined;
};

export const publicEnvironment = {
  signalingUrl: process.env.EXPO_PUBLIC_SIGNALING_URL,
  forceTurnRelay: process.env.EXPO_PUBLIC_FORCE_TURN_RELAY,
  gameCenterEnabled: process.env.EXPO_PUBLIC_GAME_CENTER_ENABLED,
  gameCenterLeaderboardsEnabled:
    process.env.EXPO_PUBLIC_GAME_CENTER_LEADERBOARDS_ENABLED,
  gameCenterAchievementsEnabled:
    process.env.EXPO_PUBLIC_GAME_CENTER_ACHIEVEMENTS_ENABLED,
} as const;

export const publicEnvironmentEntries: readonly PublicEnvironmentEntry[] = [
  {
    name: 'EXPO_PUBLIC_SIGNALING_URL',
    value: publicEnvironment.signalingUrl,
  },
  {
    name: 'EXPO_PUBLIC_FORCE_TURN_RELAY',
    value: publicEnvironment.forceTurnRelay,
  },
  {
    name: 'EXPO_PUBLIC_GAME_CENTER_ENABLED',
    value: publicEnvironment.gameCenterEnabled,
  },
  {
    name: 'EXPO_PUBLIC_GAME_CENTER_LEADERBOARDS_ENABLED',
    value: publicEnvironment.gameCenterLeaderboardsEnabled,
  },
  {
    name: 'EXPO_PUBLIC_GAME_CENTER_ACHIEVEMENTS_ENABLED',
    value: publicEnvironment.gameCenterAchievementsEnabled,
  },
];
