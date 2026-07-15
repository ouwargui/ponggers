export type PublicEnvironmentEntry = {
  name: string;
  value: string | undefined;
};

export const publicEnvironment = {
  signalingUrl: process.env.EXPO_PUBLIC_SIGNALING_URL,
  forceTurnRelay: process.env.EXPO_PUBLIC_FORCE_TURN_RELAY,
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
];
