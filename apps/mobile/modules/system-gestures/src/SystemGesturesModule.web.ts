import type { GameplaySystemGestureDeferral } from './SystemGestures.types';

const SystemGesturesModule: GameplaySystemGestureDeferral = {
  async acquireGameplayDeferral() {},
  async releaseGameplayDeferral() {},
};

export default SystemGesturesModule;
