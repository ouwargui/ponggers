import Constants from 'expo-constants';

import { publicEnvironment } from '@/config/public-environment';

const DEFAULT_SIGNALING_PORT = 8787;

export function getSignalingServerUrl() {
  const configuredUrl = publicEnvironment.signalingUrl?.trim();

  if (configuredUrl) {
    return validateSignalingUrl(configuredUrl, __DEV__);
  }

  if (!__DEV__) {
    throw new Error('EXPO_PUBLIC_SIGNALING_URL is not configured');
  }

  const developmentHost = getDevelopmentHost(Constants.expoConfig?.hostUri);
  return `ws://${developmentHost}:${DEFAULT_SIGNALING_PORT}/ws`;
}

function validateSignalingUrl(value: string, isDevelopment: boolean) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_SIGNALING_URL is not a valid URL');
  }

  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error('EXPO_PUBLIC_SIGNALING_URL must use ws:// or wss://');
  }

  if (!isDevelopment && url.protocol !== 'wss:') {
    throw new Error('Production signaling must use wss://');
  }

  return url.toString();
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
