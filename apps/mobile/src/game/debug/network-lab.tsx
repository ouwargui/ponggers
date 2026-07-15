import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GameScreen } from '@/game/game-screen';
import {
  ONLINE_MULTIPLAYER_GUEST_SESSION,
  ONLINE_MULTIPLAYER_HOST_SESSION,
  type OnlineSessionRole,
} from '@/game/session/definition';
import { createSimulatedTransportPair } from '@/game/session/simulated-transport';

const LAB_LATENCY_MS = 110;
const LAB_JITTER_MS = 70;
const LAB_PACKET_LOSS = 0.08;

export function NetworkLab({
  role,
  onExit,
}: {
  role: OnlineSessionRole;
  onExit: () => void;
}) {
  const [transportPair] = useState(() =>
    createSimulatedTransportPair({
      latencyMs: LAB_LATENCY_MS,
      jitterMs: LAB_JITTER_MS,
      packetLoss: LAB_PACKET_LOSS,
    }),
  );

  useEffect(() => transportPair.close, [transportPair]);

  const visibleSession =
    role === 'host'
      ? ONLINE_MULTIPLAYER_HOST_SESSION
      : ONLINE_MULTIPLAYER_GUEST_SESSION;
  const hiddenSession =
    role === 'host'
      ? ONLINE_MULTIPLAYER_GUEST_SESSION
      : ONLINE_MULTIPLAYER_HOST_SESSION;

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.hiddenAuthority}>
        <GameScreen
          session={hiddenSession}
          transport={transportPair.peerB}
          hapticsEnabled={false}
        />
      </View>
      <GameScreen
        session={visibleSession}
        transport={transportPair.peerA}
        onQuit={onExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hiddenAuthority: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0,
  },
});
