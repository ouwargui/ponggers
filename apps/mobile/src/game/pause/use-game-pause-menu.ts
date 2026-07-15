import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { pauseMenuFreezesSimulation } from '@/game/pause/pause-policy';
import type { GameSessionDefinition } from '@/game/session/definition';

type UseGamePauseMenuOptions = {
  session: GameSessionDefinition;
  onQuit?: () => void;
};

export function useGamePauseMenu({ session, onQuit }: UseGamePauseMenuOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const simulationPaused = useSharedValue(false);
  const freezesSimulation = pauseMenuFreezesSimulation(session.mode);

  const open = useCallback(() => {
    simulationPaused.value = freezesSimulation;
    setIsOpen(true);
  }, [freezesSimulation, simulationPaused]);

  const resume = useCallback(() => {
    simulationPaused.value = false;
    setIsOpen(false);
  }, [simulationPaused]);

  const quit = useCallback(() => {
    simulationPaused.value = false;
    onQuit?.();
  }, [onQuit, simulationPaused]);

  useEffect(() => {
    if (process.env.EXPO_OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isOpen) {
          resume();
        } else {
          open();
        }

        return true;
      },
    );

    return () => subscription.remove();
  }, [isOpen, open, resume]);

  return {
    freezesSimulation,
    isOpen,
    open,
    quit,
    resume,
    simulationPaused,
  };
}
