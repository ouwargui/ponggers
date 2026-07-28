export function isGameCenterEnabled(value: string | undefined) {
  return value === 'true';
}

export function isGameCenterFeatureEnabled(
  gameCenter: string | undefined,
  feature: string | undefined,
) {
  return isGameCenterEnabled(gameCenter) && isGameCenterEnabled(feature);
}

export const GAME_CENTER_ENABLED = isGameCenterEnabled(
  process.env.EXPO_PUBLIC_GAME_CENTER_ENABLED,
);

export const GAME_CENTER_ACHIEVEMENTS_ENABLED = isGameCenterFeatureEnabled(
  process.env.EXPO_PUBLIC_GAME_CENTER_ENABLED,
  process.env.EXPO_PUBLIC_GAME_CENTER_ACHIEVEMENTS_ENABLED,
);

export const GAME_CENTER_LEADERBOARDS_ENABLED = isGameCenterFeatureEnabled(
  process.env.EXPO_PUBLIC_GAME_CENTER_ENABLED,
  process.env.EXPO_PUBLIC_GAME_CENTER_LEADERBOARDS_ENABLED,
);
