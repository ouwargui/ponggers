import { normalizeRoomCode } from '@ponggers/signaling-protocol';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameScreen } from '@/game/game-screen';
import {
  ONLINE_MULTIPLAYER_GUEST_SESSION,
  ONLINE_MULTIPLAYER_HOST_SESSION,
  type OnlineSessionRole,
} from '@/game/session/definition';
import type {
  OnlineMatchConnectionSnapshot,
  OnlineMatchConnectionState,
} from '@/game/session/online-match-connection';
import { OnlineMatchConnection } from '@/game/session/online-match-connection';
import { getSignalingServerUrl } from '@/game/session/signaling-server-url';
import { useGameTheme } from '@/game/themes/game-theme-provider';

type LobbyMode = 'menu' | 'join';

const INITIAL_CONNECTION: OnlineMatchConnectionSnapshot = {
  error: null,
  roomCode: null,
  state: 'closed',
};

export function OnlineMatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useGameTheme();
  const [mode, setMode] = useState<LobbyMode>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [role, setRole] = useState<OnlineSessionRole | null>(null);
  const [connection, setConnection] = useState<OnlineMatchConnection | null>(
    null,
  );
  const [snapshot, setSnapshot] = useState(INITIAL_CONNECTION);
  const [hasConnected, setHasConnected] = useState(false);

  useEffect(() => {
    if (!connection) {
      return;
    }

    setSnapshot(connection.snapshot);
    const unsubscribe = connection.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);

      if (nextSnapshot.state === 'connected') {
        setHasConnected(true);
      }
    });

    void connection.start();

    return () => {
      unsubscribe();
      connection.close();
    };
  }, [connection]);

  const startConnection = useCallback(
    (nextRole: OnlineSessionRole, code?: string) => {
      try {
        const nextConnection = new OnlineMatchConnection({
          role: nextRole,
          roomCode: code,
          signalingUrl: getSignalingServerUrl(),
        });
        setRole(nextRole);
        setHasConnected(false);
        setSnapshot(nextConnection.snapshot);
        setConnection(nextConnection);
      } catch (error) {
        setSnapshot({
          error:
            error instanceof Error
              ? error.message
              : 'Could not configure online play',
          roomCode: null,
          state: 'failed',
        });
      }
    },
    [],
  );

  const resetLobby = useCallback(() => {
    connection?.close();
    setConnection(null);
    setRole(null);
    setSnapshot(INITIAL_CONNECTION);
    setHasConnected(false);
    setMode('menu');
  }, [connection]);

  const quit = useCallback(() => {
    connection?.close();
    router.replace('/');
  }, [connection, router]);

  if (hasConnected && connection && role) {
    return (
      <View style={styles.gameContainer}>
        <GameScreen
          session={
            role === 'host'
              ? ONLINE_MULTIPLAYER_HOST_SESSION
              : ONLINE_MULTIPLAYER_GUEST_SESSION
          }
          transport={connection.peer.transport}
          onQuit={quit}
        />
        {snapshot.state === 'reconnecting' || snapshot.state === 'failed' ? (
          <View
            accessibilityLiveRegion="assertive"
            style={[
              styles.connectionOverlay,
              { backgroundColor: `${palette.arena}E8` },
            ]}
          >
            <Text
              style={[
                styles.connectionOverlayTitle,
                { color: palette.ball.core },
              ]}
            >
              {snapshot.state === 'reconnecting'
                ? 'RECONNECTING'
                : 'CONNECTION LOST'}
            </Text>
            <Text
              style={[
                styles.connectionOverlayMessage,
                { color: `${palette.ball.core}AA` },
              ]}
            >
              {snapshot.state === 'reconnecting'
                ? 'Trying to restore the peer-to-peer match…'
                : snapshot.error}
            </Text>
            {snapshot.state === 'failed' ? (
              <>
                <LobbyButton
                  color={palette.players.bottom.glow}
                  label="NEW MATCH"
                  onPress={resetLobby}
                />
                <LobbyButton
                  color={palette.ball.core}
                  label="HOME"
                  onPress={quit}
                />
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  const accent = palette.players.bottom.glow;
  const normalizedCode = normalizeRoomCode(roomCode);
  const isConnecting =
    connection !== null &&
    snapshot.state !== 'failed' &&
    snapshot.state !== 'closed';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: palette.arena }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.topArena,
          { backgroundColor: `${palette.players.top.glow}0D` },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bottomArena,
          { backgroundColor: `${palette.players.bottom.glow}0D` },
        ]}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: accent }]}>ONLINE</Text>

        {isConnecting ? (
          <ConnectionStatus
            accent={accent}
            onCancel={resetLobby}
            snapshot={snapshot}
            textColor={palette.ball.core}
          />
        ) : snapshot.state === 'failed' ? (
          <>
            <Text style={[styles.title, { color: palette.ball.core }]}>
              OFFLINE
            </Text>
            <Text style={[styles.error, { color: palette.players.top.core }]}>
              {snapshot.error}
            </Text>
            <LobbyButton
              color={accent}
              label="TRY AGAIN"
              onPress={resetLobby}
            />
            <LobbyButton
              color={palette.ball.core}
              label="HOME"
              onPress={quit}
            />
          </>
        ) : mode === 'join' ? (
          <>
            <Text style={[styles.title, { color: palette.ball.core }]}>
              JOIN
            </Text>
            <TextInput
              accessibilityLabel="Room code"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              onChangeText={(value) => setRoomCode(normalizeRoomCode(value))}
              placeholder="CODE"
              placeholderTextColor={`${palette.ball.core}33`}
              selectionColor={accent}
              style={[
                styles.codeInput,
                { borderColor: `${accent}66`, color: palette.ball.core },
              ]}
              value={roomCode}
            />
            <LobbyButton
              color={accent}
              disabled={normalizedCode.length !== 6}
              label="JOIN MATCH"
              onPress={() => startConnection('guest', normalizedCode)}
            />
            <LobbyButton
              color={palette.ball.core}
              label="BACK"
              onPress={() => setMode('menu')}
            />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: palette.ball.core }]}>
              MATCH
            </Text>
            <LobbyButton
              color={accent}
              label="CREATE ROOM"
              onPress={() => startConnection('host')}
            />
            <LobbyButton
              color={palette.ball.core}
              label="JOIN ROOM"
              onPress={() => setMode('join')}
            />
            <LobbyButton
              color={palette.ball.core}
              label="BACK"
              onPress={quit}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function ConnectionStatus({
  accent,
  onCancel,
  snapshot,
  textColor,
}: {
  accent: string;
  onCancel: () => void;
  snapshot: OnlineMatchConnectionSnapshot;
  textColor: string;
}) {
  return (
    <View style={styles.statusContent}>
      {snapshot.roomCode ? (
        <>
          <Text style={[styles.statusLabel, { color: textColor }]}>
            ROOM CODE
          </Text>
          <Text style={[styles.roomCode, { color: textColor }]}>
            {snapshot.roomCode}
          </Text>
        </>
      ) : null}
      <Text style={[styles.status, { color: textColor }]}>
        {getConnectionLabel(snapshot.state)}
      </Text>
      <Text style={[styles.hint, { color: `${textColor}88` }]}>
        Keep this screen open while the connection is negotiated.
      </Text>
      <LobbyButton color={accent} label="CANCEL" onPress={onCancel} />
    </View>
  );
}

function LobbyButton({
  color,
  disabled = false,
  label,
  onPress,
}: {
  color: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { opacity: disabled ? 0.25 : pressed ? 0.55 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function getConnectionLabel(state: OnlineMatchConnectionState) {
  if (state === 'waiting-for-opponent') {
    return 'WAITING FOR OPPONENT';
  }

  if (state === 'negotiating') {
    return 'CONNECTING PEER TO PEER';
  }

  return state === 'reconnecting' ? 'RECONNECTING' : 'CONNECTING';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gameContainer: { flex: 1 },
  connectionOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 32,
  },
  connectionOverlayTitle: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 5,
  },
  connectionOverlayMessage: {
    maxWidth: 320,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 28,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 7,
  },
  title: {
    marginBottom: 22,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 8,
  },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
  },
  codeInput: {
    width: 260,
    height: 76,
    borderWidth: 1,
    borderRadius: 20,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 8,
  },
  statusContent: {
    alignItems: 'center',
    gap: 18,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 5,
  },
  roomCode: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 10,
  },
  status: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
  },
  hint: {
    maxWidth: 320,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    maxWidth: 320,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
  },
});
