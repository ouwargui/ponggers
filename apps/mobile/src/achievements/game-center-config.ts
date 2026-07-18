export function isGameCenterEnabled(value: string | undefined) {
  return value === 'true';
}

export const GAME_CENTER_ENABLED = isGameCenterEnabled(
  process.env.EXPO_PUBLIC_GAME_CENTER_ENABLED,
);
