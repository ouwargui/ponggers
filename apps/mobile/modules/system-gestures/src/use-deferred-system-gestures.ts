import { useEffect, useState } from 'react';
import SystemGesturesModule from './SystemGesturesModule';

function createDeferralOwner() {
  return `game-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useDeferredSystemGestures(enabled = true) {
  const [owner] = useState(createDeferralOwner);

  useEffect(() => {
    const nativeModule = SystemGesturesModule;

    if (!enabled || !nativeModule) {
      return;
    }

    void nativeModule.acquireGameplayDeferral(owner);

    return () => {
      void nativeModule.releaseGameplayDeferral(owner);
    };
  }, [enabled, owner]);
}
