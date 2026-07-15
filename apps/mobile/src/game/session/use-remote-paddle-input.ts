import { useEffect } from 'react';
import {
  type SharedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import type { PaddleInput } from '@/game/engine/types';
import type { GameSessionDefinition } from '@/game/session/definition';
import {
  createRemotePaddleInputInbox,
  interpolateRemotePaddle,
} from '@/game/session/remote-input';
import type { SessionTransport } from '@/game/session/transport';
import type { SessionPaddles } from '@/game/session/use-session-paddles';

function setRemoteInputTarget(
  target: SharedValue<PaddleInput | null>,
  input: PaddleInput,
) {
  'worklet';

  target.value = input;
}

type UseRemotePaddleInputOptions = {
  session: GameSessionDefinition;
  transport?: SessionTransport;
  paddles: SessionPaddles;
};

export function useRemotePaddleInput({
  session,
  transport,
  paddles,
}: UseRemotePaddleInputOptions) {
  const topPaddle = paddles.top;
  const bottomPaddle = paddles.bottom;
  const target = useSharedValue<PaddleInput | null>(null);

  useFrameCallback(({ timeSincePreviousFrame }) => {
    const input = target.value;

    if (!input || timeSincePreviousFrame === null) {
      return;
    }

    const paddle = input.playerId === 'top' ? topPaddle : bottomPaddle;
    const currentPaddle = paddle.value;
    const nextPaddle = interpolateRemotePaddle(
      currentPaddle,
      input,
      timeSincePreviousFrame / 1000,
    );

    paddle.value = nextPaddle;

    if (
      nextPaddle.centerX === currentPaddle.centerX ||
      nextPaddle.centerX === input.centerX
    ) {
      target.value = null;
    }
  });

  useEffect(() => {
    if (!transport) {
      return;
    }

    const inbox = createRemotePaddleInputInbox(session);

    return transport.subscribe((message) => {
      if (message.type !== 'paddle-input') {
        return;
      }

      const input = inbox.receive(message);

      if (!input) {
        return;
      }

      scheduleOnUI(setRemoteInputTarget, target, input);
    });
  }, [session, target, transport]);
}
