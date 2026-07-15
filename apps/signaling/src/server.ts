import {
  encodeServerSignalingMessage,
  MAX_SIGNAL_LENGTH,
} from '@ponggers/signaling-protocol';
import type { ServerWebSocket } from 'bun';

import { type SignalingClient, SignalingHub } from './signaling-hub';

type SocketData = {
  id: string;
};

type StartSignalingServerOptions = {
  hostname?: string;
  port?: number;
};

export function startSignalingServer({
  hostname = '0.0.0.0',
  port = Number(Bun.env.PORT ?? 3001),
}: StartSignalingServerOptions = {}) {
  const hub = new SignalingHub();
  const clients = new Map<string, SignalingClient>();

  return Bun.serve<SocketData>({
    hostname,
    port,
    fetch(request, server) {
      const url = new URL(request.url);

      if (url.pathname === '/health') {
        return Response.json({ ok: true });
      }

      if (
        url.pathname === '/ws' &&
        server.upgrade(request, { data: { id: crypto.randomUUID() } })
      ) {
        return;
      }

      return new Response('Not found', { status: 404 });
    },
    websocket: {
      idleTimeout: 120,
      maxPayloadLength: MAX_SIGNAL_LENGTH + 1024,
      open(socket) {
        clients.set(socket.data.id, createClient(socket));
      },
      message(socket, message) {
        const client = clients.get(socket.data.id);

        if (!client) {
          socket.close(1011, 'Signaling client is not initialized');
          return;
        }

        const payload =
          typeof message === 'string'
            ? message
            : new TextDecoder().decode(message);
        hub.handle(client, payload);
      },
      close(socket) {
        const client = clients.get(socket.data.id);

        if (client) {
          hub.disconnect(client);
          clients.delete(socket.data.id);
        }
      },
    },
  });
}

function createClient(socket: ServerWebSocket<SocketData>): SignalingClient {
  return {
    id: socket.data.id,
    send(message) {
      socket.send(encodeServerSignalingMessage(message));
    },
  };
}
