import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { publicEnvironmentEntries } from '@/config/public-environment';
import { getSignalingServerUrl } from '@/game/session/signaling-server-url';
import { useGameTheme } from '@/game/themes/game-theme-provider';

function getResolvedSignalingUrl() {
  try {
    return getSignalingServerUrl();
  } catch (error) {
    return error instanceof Error ? error.message : 'Unable to resolve URL';
  }
}

export function EnvironmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useGameTheme();
  const close = useCallback(() => {
    router.replace('/');
  }, [router]);

  useEffect(() => {
    if (process.env.EXPO_OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        close();
        return true;
      },
    );

    return () => subscription.remove();
  }, [close]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.arena }]}>
      <View
        pointerEvents="none"
        style={[
          styles.topArena,
          { backgroundColor: `${palette.players.top.glow}12` },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bottomArena,
          { backgroundColor: `${palette.players.bottom.glow}12` },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: palette.players.bottom.glow }]}>
          DEVELOPMENT
        </Text>
        <Text style={[styles.title, { color: palette.ball.core }]}>
          ENVIRONMENT
        </Text>
        <Text style={[styles.description, { color: `${palette.ball.core}99` }]}>
          Every public environment variable used by the mobile app. Unset values
          use the app&apos;s development fallback when one exists.
        </Text>

        <View style={styles.list}>
          {publicEnvironmentEntries.map((entry) => {
            const isSet = entry.value !== undefined && entry.value.length > 0;

            return (
              <View
                key={entry.name}
                style={[
                  styles.card,
                  {
                    backgroundColor: `${palette.ball.core}08`,
                    borderColor: isSet
                      ? `${palette.players.bottom.glow}66`
                      : `${palette.players.top.glow}66`,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text
                    selectable
                    style={[styles.name, { color: palette.ball.core }]}
                  >
                    {entry.name}
                  </Text>
                  <Text
                    style={[
                      styles.status,
                      {
                        color: isSet
                          ? palette.players.bottom.glow
                          : palette.players.top.glow,
                      },
                    ]}
                  >
                    {isSet ? 'SET' : 'UNSET'}
                  </Text>
                </View>
                <Text
                  selectable
                  style={[styles.value, { color: `${palette.ball.core}B8` }]}
                >
                  {isSet ? entry.value : 'Not configured'}
                </Text>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.resolvedCard,
            { borderColor: `${palette.ball.glow}38` },
          ]}
        >
          <Text style={[styles.resolvedLabel, { color: palette.ball.glow }]}>
            RESOLVED SIGNALING URL
          </Text>
          <Text
            selectable
            style={[styles.value, { color: `${palette.ball.core}B8` }]}
          >
            {getResolvedSignalingUrl()}
          </Text>
        </View>

        <Pressable
          accessibilityHint="Returns to the home menu"
          accessibilityLabel="Close environment diagnostics"
          accessibilityRole="button"
          onPress={close}
          style={({ pressed }) => [
            styles.closeButton,
            {
              borderColor: palette.players.bottom.glow,
              backgroundColor: pressed
                ? `${palette.players.bottom.glow}18`
                : 'transparent',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[styles.closeLabel, { color: palette.players.bottom.glow }]}
          >
            CLOSE
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topArena: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: '50%',
  },
  bottomArena: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '50%',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
  },
  title: {
    marginTop: 8,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
  },
  description: {
    maxWidth: 520,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 12,
    marginTop: 32,
  },
  card: {
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderRadius: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  status: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  value: {
    fontSize: 14,
    lineHeight: 21,
    fontVariant: ['tabular-nums'],
  },
  resolvedCard: {
    gap: 10,
    marginTop: 20,
    padding: 18,
    borderWidth: 1,
    borderRadius: 18,
  },
  resolvedLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  closeButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderRadius: 27,
  },
  closeLabel: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
