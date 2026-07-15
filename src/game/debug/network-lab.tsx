import { useEffect, useState } from 'react';

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

  useSimulatedOpponent(transportPair.peerB);

  useEffect(() => transportPair.close, [transportPair]);
  useEffect(
    () =>
      transportPair.peerB.subscribe((message) => {
        respondToPing(transportPair.peerB, message);
      }),
    [transportPair],
  );

  const session =
    role === 'host'
      ? ONLINE_MULTIPLAYER_HOST_SESSION
      : ONLINE_MULTIPLAYER_GUEST_SESSION;

  return <GameScreen session={session} transport={transportPair.peerA} />;
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
