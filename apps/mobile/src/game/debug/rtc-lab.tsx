import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import type { SessionTransportState } from '@/game/session/transport';
import { WebRtcSessionPeer } from '@/game/session/web-rtc-peer';
import { useGameTheme } from '@/game/themes/game-theme-provider';

export function RtcLab({
  role,
  onExit,
}: {
  role: OnlineSessionRole;
  onExit: () => void;
}) {
  const { palette } = useGameTheme();
  const insets = useSafeAreaInsets();
  const [peer] = useState(() => new WebRtcSessionPeer(role));
  const [connectionState, setConnectionState] = useState<SessionTransportState>(
    peer.transport.state,
  );
  const [hasConnected, setHasConnected] = useState(
    peer.transport.state === 'open',
  );
  const [incomingSignal, setIncomingSignal] = useState('');
  const [outgoingSignal, setOutgoingSignal] = useState('');
  const [busy, setBusy] = useState(role === 'host');
  const [error, setError] = useState<string | null>(null);
  const accent =
    role === 'host' ? palette.players.bottom.glow : palette.players.top.glow;

  useEffect(() => {
    const unsubscribeState = peer.transport.subscribeState((state) => {
      setConnectionState(state);

      if (state === 'open') {
        setHasConnected(true);
      }
    });

    return () => {
      unsubscribeState();
      peer.close();
    };
  }, [peer]);

  useEffect(() => {
    if (role !== 'host') {
      return;
    }

    let cancelled = false;

    void peer
      .createOfferSignal()
      .then((signal) => {
        if (!cancelled) {
          setOutgoingSignal(signal);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(cause));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [peer, role]);

  const createAnswer = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      const signal = await peer.acceptOfferAndCreateAnswerSignal(
        incomingSignal.trim(),
      );
      setOutgoingSignal(signal);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [incomingSignal, peer]);

  const acceptAnswer = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      await peer.acceptAnswerSignal(incomingSignal.trim());
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [incomingSignal, peer]);

  const shareSignal = useCallback(async () => {
    if (!outgoingSignal) {
      return;
    }

    try {
      await Share.share({ message: outgoingSignal });
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }, [outgoingSignal]);

  const connected = connectionState === 'open';
  const keepsRunningDuringReconnect =
    hasConnected && connectionState === 'connecting';
  const canSubmit = incomingSignal.trim().length > 0 && !busy && !connected;
  const status = getLabStatus({
    busy,
    connected,
    connectionState,
    hasOutgoingSignal: outgoingSignal.length > 0,
    role,
  });

  if (connected || keepsRunningDuringReconnect) {
    return (
      <GameScreen
        trackStatistics={false}
        session={
          role === 'host'
            ? ONLINE_MULTIPLAYER_HOST_SESSION
            : ONLINE_MULTIPLAYER_GUEST_SESSION
        }
        transport={peer.transport}
        onQuit={onExit}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.arena }}
    >
      <View
        pointerEvents="none"
        style={[styles.arenaTint, { backgroundColor: accent, opacity: 0.06 }]}
      />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 36,
          paddingRight: 24,
          paddingBottom: insets.bottom + 36,
          paddingLeft: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[styles.eyebrow, { color: accent }]}>RTC LAB</Text>
          <Text style={[styles.title, { color: palette.ball.core }]}>
            {role === 'host' ? 'HOST' : 'GUEST'}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: connected
                    ? palette.players.bottom.glow
                    : connectionState === 'failed'
                      ? palette.players.top.glow
                      : palette.ball.glow,
                },
              ]}
            />
            <Text style={[styles.status, { color: palette.ball.core }]}>
              {status}
            </Text>
            {busy ? <ActivityIndicator color={accent} size="small" /> : null}
          </View>

          {outgoingSignal ? (
            <SignalSection
              accent={accent}
              label={role === 'host' ? 'HOST OFFER' : 'GUEST ANSWER'}
              signal={outgoingSignal}
              textColor={palette.ball.core}
              onShare={shareSignal}
            />
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: accent }]}>
              {role === 'host' ? 'PASTE GUEST ANSWER' : 'PASTE HOST OFFER'}
            </Text>
            <TextInput
              accessibilityLabel={
                role === 'host' ? 'Guest answer' : 'Host offer'
              }
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              multiline
              onChangeText={setIncomingSignal}
              placeholder="Paste the complete Ponggers RTC signal here"
              placeholderTextColor={`${palette.ball.core}55`}
              selectionColor={accent}
              style={[
                styles.signalInput,
                {
                  borderColor: `${accent}66`,
                  color: palette.ball.core,
                },
              ]}
              value={incomingSignal}
            />
            <LabButton
              accent={accent}
              disabled={!canSubmit}
              label={role === 'host' ? 'ACCEPT ANSWER' : 'CREATE ANSWER'}
              onPress={role === 'host' ? acceptAnswer : createAnswer}
            />
          </View>

          {role === 'guest' && outgoingSignal ? (
            <Text style={[styles.hint, { color: palette.ball.core }]}>
              Share the answer back to the host. The match opens after the host
              accepts it.
            </Text>
          ) : null}

          {error ? (
            <Text style={[styles.error, { color: palette.players.top.core }]}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignalSection({
  accent,
  label,
  onShare,
  signal,
  textColor,
}: {
  accent: string;
  label: string;
  onShare: () => void;
  signal: string;
  textColor: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: accent }]}>{label}</Text>
      <View style={[styles.signalOutput, { borderColor: `${accent}66` }]}>
        <Text selectable style={[styles.signalText, { color: textColor }]}>
          {signal || 'Gathering ICE candidates…'}
        </Text>
      </View>
      <LabButton
        accent={accent}
        disabled={!signal}
        label="SHARE SIGNAL"
        onPress={onShare}
      />
    </View>
  );
}

function LabButton({
  accent,
  disabled,
  label,
  onPress,
}: {
  accent: string;
  disabled: boolean;
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
        {
          borderColor: accent,
          opacity: disabled ? 0.3 : pressed ? 0.65 : 1,
          backgroundColor: pressed ? `${accent}18` : 'transparent',
        },
      ]}
    >
      <Text style={[styles.buttonLabel, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

function getLabStatus({
  busy,
  connected,
  connectionState,
  hasOutgoingSignal,
  role,
}: {
  busy: boolean;
  connected: boolean;
  connectionState: SessionTransportState;
  hasOutgoingSignal: boolean;
  role: OnlineSessionRole;
}) {
  if (connected) {
    return 'PEER CONNECTED';
  }

  if (connectionState === 'failed') {
    return 'CONNECTION FAILED';
  }

  if (busy) {
    return role === 'host' ? 'CREATING OFFER' : 'CREATING ANSWER';
  }

  if (!hasOutgoingSignal) {
    return role === 'host' ? 'GATHERING ICE' : 'WAITING FOR OFFER';
  }

  return role === 'host' ? 'WAITING FOR ANSWER' : 'WAITING FOR HOST';
}

function getErrorMessage(cause: unknown) {
  return cause instanceof Error
    ? cause.message
    : 'An unknown RTC error occurred';
}

const styles = StyleSheet.create({
  arenaTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 18,
  },
  eyebrow: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 6,
  },
  title: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 7,
  },
  statusRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.7,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  signalOutput: {
    maxHeight: 150,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  signalText: {
    fontSize: 10,
    lineHeight: 15,
    opacity: 0.65,
  },
  signalInput: {
    minHeight: 128,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 11,
    lineHeight: 16,
    textAlignVertical: 'top',
  },
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 22,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.55,
  },
  error: {
    borderRadius: 12,
    padding: 12,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    backgroundColor: '#7f1d1d55',
  },
});
