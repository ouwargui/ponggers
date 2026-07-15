import { Redirect } from 'expo-router';

import { EnvironmentScreen } from '@/development/environment-screen';

export default function EnvironmentRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <EnvironmentScreen />;
}
