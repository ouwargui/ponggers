import type { ConfigContext, ExpoConfig } from 'expo/config';

const isDevelopment = process.env.APP_VARIANT === 'development';

const appName = isDevelopment ? 'Pongguinho' : 'Ponggers';
const appIdentifier = isDevelopment
  ? 'com.ouwargui.ponggers.dev'
  : 'com.ouwargui.ponggers';
const appScheme = isDevelopment ? 'ponggers-dev' : 'ponggers';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  description:
    'Ponggers is a local and multiplayer pong game that you can play with your friends.',
  slug: 'ponggers',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/ponggers.png',
  scheme: appScheme,
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/ponggers.icon',
    bundleIdentifier: appIdentifier,
    requireFullScreen: true,
    infoPlist: {
      GCSupportsGameMode: true,
      ITSAppUsesNonExemptEncryption: false,
    },
    bitcode: false,
    entitlements: {
      "com.apple.developer.game-center": true,
    },
  },
  android: {
    package: appIdentifier,
    adaptiveIcon: {
      backgroundColor: '#02050A',
      foregroundImage: './assets/ponggers.png',
      backgroundImage: './assets/ponggers.png',
      monochromeImage: './assets/ponggers.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CAMERA',
      'android.permission.INTERNET',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WAKE_LOCK',
      'android.permission.BLUETOOTH',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-dev-client',
      {
        addGeneratedScheme: isDevelopment,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#02050A',
        image: './assets/ponggers.png',
        imageWidth: 76,
      },
    ],
    '@config-plugins/react-native-webrtc',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'abbd0788-90a5-447c-903f-224548bcdf0a',
    },
  },
  owner: 'ouwargui',
};
