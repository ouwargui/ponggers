import { useCallback, useEffect } from 'react';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import type { PaddleState } from '@/game/engine/types';
import type { GameSessionDefinition } from '@/game/session/definition';
import {
  applyPaddleLayout,
  createPaddleLayoutMessage,
  mapRemotePaddleLayout,
} from '@/game/session/paddle-layout';
import type { PaddleLayoutMessage } from '@/game/session/protocol';
import type { SessionTransport } from '@/game/session/transport';
import type { SessionPaddles } from '@/game/session/use-session-paddles';

type UseOnlinePaddleLayoutOptions = {
  session: GameSessionDefinition;
  transport?: SessionTransport;
  paddles: SessionPaddles;
};

function applyRemoteLayout(
  paddle: SessionPaddles['top'],
  layout: PaddleLayoutMessage,
) {
  'worklet';

  paddle.value = applyPaddleLayout(paddle.value, layout);
}

export function useOnlinePaddleLayout({
  session,
  transport,
  paddles,
}: UseOnlinePaddleLayoutOptions) {
  const isOnline = session.mode === 'online-multiplayer';
  const sendLayout = useCallback(
    (paddle: PaddleState) => {
      transport?.send(createPaddleLayoutMessage(paddle));
    },
    [transport],
  );

  useAnimatedReaction(
    () => {
      if (!isOnline) {
        return null;
      }

      const paddle = paddles.bottom.value;

      return paddle.height > 0 ? paddle : null;
    },
    (paddle, previous) => {
      if (
        !paddle ||
        (previous &&
          paddle.centerY === previous.centerY &&
          paddle.height === previous.height)
      ) {
        return;
      }

      scheduleOnRN(sendLayout, paddle);
    },
  );

  useEffect(() => {
    if (!isOnline || !transport) {
      return;
    }

    let successfulSends = 0;
    const sendCurrentLayout = () => {
      const paddle = paddles.bottom.value;

      if (paddle.height <= 0) {
        return;
      }

      sendLayout(paddle);
      successfulSends += 1;

      if (successfulSends >= 3) {
        clearInterval(interval);
      }
    };
    const interval = setInterval(sendCurrentLayout, 400);
    sendCurrentLayout();

    return () => clearInterval(interval);
  }, [isOnline, paddles.bottom, sendLayout, transport]);

  useEffect(() => {
    if (!isOnline || !transport) {
      return;
    }

    return transport.subscribe((message) => {
      if (message.type !== 'paddle-layout') {
        return;
      }

      const layout = mapRemotePaddleLayout(session, message);

      if (layout) {
        scheduleOnUI(applyRemoteLayout, paddles.top, layout);
      }
    });
  }, [isOnline, paddles.top, session, transport]);
}
