import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { createMMKV } from 'react-native-mmkv';

import {
  DEFAULT_GAME_PREFERENCES,
  GAME_PREFERENCES_STORAGE_KEY,
  type GamePreferences,
  parseGamePreferences,
} from '@/settings/game-preferences';

type GamePreferencesContextValue = {
  clearPreferencesStorage: () => void;
  preferences: GamePreferences;
  resetPreferences: () => void;
  setPreference: <Key extends keyof GamePreferences>(
    key: Key,
    value: GamePreferences[Key],
  ) => void;
};

const GamePreferencesContext =
  createContext<GamePreferencesContextValue | null>(null);

const preferencesStorage = createMMKV({ id: 'ponggers-preferences' });

function persistPreferences(preferences: GamePreferences) {
  preferencesStorage.set(
    GAME_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
}

export function GamePreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(() =>
    parseGamePreferences(
      preferencesStorage.getString(GAME_PREFERENCES_STORAGE_KEY),
    ),
  );

  const setPreference = useCallback(
    <Key extends keyof GamePreferences>(
      key: Key,
      value: GamePreferences[Key],
    ) => {
      setPreferences((current) => {
        const next = { ...current, [key]: value };
        persistPreferences(next);
        return next;
      });
    },
    [],
  );
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_GAME_PREFERENCES);
    persistPreferences(DEFAULT_GAME_PREFERENCES);
  }, []);
  const clearPreferencesStorage = useCallback(() => {
    preferencesStorage.clearAll();
    setPreferences(DEFAULT_GAME_PREFERENCES);
  }, []);
  const value = useMemo(
    () => ({
      clearPreferencesStorage,
      preferences,
      resetPreferences,
      setPreference,
    }),
    [clearPreferencesStorage, preferences, resetPreferences, setPreference],
  );

  return (
    <GamePreferencesContext.Provider value={value}>
      {children}
    </GamePreferencesContext.Provider>
  );
}

export function useGamePreferences(): GamePreferencesContextValue {
  const value = useContext(GamePreferencesContext);

  if (!value) {
    throw new Error(
      'useGamePreferences must be used inside GamePreferencesProvider',
    );
  }

  return value;
}
