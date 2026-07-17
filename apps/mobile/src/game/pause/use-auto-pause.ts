import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

type UseAutoPauseOptions = {
  enabled: boolean;
  onPause: () => void;
};

export function useAutoPause({ enabled, onPause }: UseAutoPauseOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const changeSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState !== 'active') {
          onPause();
        }
      },
    );
    const blurSubscription =
      Platform.OS === 'android'
        ? AppState.addEventListener('blur', onPause)
        : null;

    if (AppState.currentState !== 'active') {
      onPause();
    }

    return () => {
      changeSubscription.remove();
      blurSubscription?.remove();
    };
  }, [enabled, onPause]);
}
