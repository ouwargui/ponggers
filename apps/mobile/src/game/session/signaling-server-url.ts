import Constants from 'expo-constants';

const DEFAULT_SIGNALING_PORT = 3001;

export function getSignalingServerUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_SIGNALING_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (!__DEV__) {
    throw new Error('EXPO_PUBLIC_SIGNALING_URL is not configured');
  }

  const developmentHost = getDevelopmentHost(Constants.expoConfig?.hostUri);
  return `ws://${developmentHost}:${DEFAULT_SIGNALING_PORT}/ws`;
}

function getDevelopmentHost(hostUri: string | undefined) {
  if (!hostUri) {
    return 'localhost';
  }

  try {
    return new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`)
      .hostname;
  } catch {
    return 'localhost';
  }
}
