import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GAME_TICK_RATE, PADDLE_INPUT_SEND_RATE } from '@/game/constants';
import { GameScreen } from '@/game/game-screen';
import {
  ONLINE_MULTIPLAYER_GUEST_SESSION,
  ONLINE_MULTIPLAYER_HOST_SESSION,
  type OnlineSessionRole,
} from '@/game/session/definition';
import { createPaddleInput } from '@/game/session/input';
import { respondToPing } from '@/game/session/latency';
import { createSimulatedTransportPair } from '@/game/session/simulated-transport';
import type { SessionTransport } from '@/game/session/transport';

const LAB_LATENCY_MS = 110;
const LAB_JITTER_MS = 70;
const LAB_PACKET_LOSS = 0.08;
const OPPONENT_TRAVEL_RATIO = 0.3;
const OPPONENT_CYCLE_SECONDS = 2.8;

export function NetworkLab({ role }: { role: OnlineSessionRole }) {
  const [transportPair] = useState(() =>
    createSimulatedTransportPair({
      latencyMs: LAB_LATENCY_MS,
      jitterMs: LAB_JITTER_MS,
      packetLoss: LAB_PACKET_LOSS,
    }),
  );

  useEffect(() => transportPair.close, [transportPair]);

  return role === 'host' ? (
    <HostNetworkLab transportPair={transportPair} />
  ) : (
    <GuestNetworkLab transportPair={transportPair} />
  );
}

type NetworkLabTransportPair = ReturnType<typeof createSimulatedTransportPair>;

function HostNetworkLab({
  transportPair,
}: {
  transportPair: NetworkLabTransportPair;
}) {
  useSimulatedOpponent(transportPair.peerB);
  usePingResponder(transportPair.peerB);

  return (
    <GameScreen
      session={ONLINE_MULTIPLAYER_HOST_SESSION}
      transport={transportPair.peerA}
    />
  );
}

function GuestNetworkLab({
  transportPair,
}: {
  transportPair: NetworkLabTransportPair;
}) {
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.hiddenAuthority}>
        <GameScreen
          session={ONLINE_MULTIPLAYER_HOST_SESSION}
          transport={transportPair.peerB}
          hapticsEnabled={false}
        />
      </View>
      <GameScreen
        session={ONLINE_MULTIPLAYER_GUEST_SESSION}
        transport={transportPair.peerA}
      />
    </View>
  );
}

function usePingResponder(transport: SessionTransport) {
  useEffect(
    () =>
      transport.subscribe((message) => {
        respondToPing(transport, message);
      }),
    [transport],
  );
}

function useSimulatedOpponent(transport: SessionTransport) {
  useEffect(() => {
    const startedAt = performance.now();
    let lastSentAt = startedAt;
    let lastCenterX = 0.5;
    let sequence = 0;

    const sendInput = () => {
      const now = performance.now();
      const elapsedSeconds = (now - startedAt) / 1000;
      const deltaSeconds = Math.max((now - lastSentAt) / 1000, 0.001);
      const centerX =
        0.5 +
        Math.sin((elapsedSeconds * Math.PI * 2) / OPPONENT_CYCLE_SECONDS) *
          OPPONENT_TRAVEL_RATIO;

      sequence += 1;
      transport.send(
        createPaddleInput({
          playerId: 'bottom',
          sequence,
          centerX,
          velocityX: (centerX - lastCenterX) / deltaSeconds,
          clientTick: Math.floor(elapsedSeconds * GAME_TICK_RATE),
        }),
      );

      lastCenterX = centerX;
      lastSentAt = now;
    };

    sendInput();
    const interval = setInterval(sendInput, 1000 / PADDLE_INPUT_SEND_RATE);

    return () => clearInterval(interval);
  }, [transport]);
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
