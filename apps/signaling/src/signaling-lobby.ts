import { DurableObject } from 'cloudflare:workers';
import {
  encodeServerSignalingMessage,
  MAX_SIGNAL_LENGTH,
  type ServerSignalingMessage,
  type SessionConfig,
} from '@ponggers/signaling-protocol';

import {
  type CloudflareTurnEnvironment,
  issueCloudflareTurnConfig,
} from './cloudflare-turn';
import {
  type CoordinationResult,
  disconnectSignalingMember,
  expireSignalingRooms,
  getNextRoomExpiration,
  getRoomStats,
  handleSignalingPayload,
  type SignalingDelivery,
  type SignalingMember,
} from './room-coordinator';

const MAX_CONNECTIONS_PER_IP = 8;
const MESSAGE_RATE_LIMIT = 60;
const MESSAGE_RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_PAYLOAD_BYTES = MAX_SIGNAL_LENGTH + 1024;

export interface Env extends CloudflareTurnEnvironment {
  SIGNALING_LOBBY: DurableObjectNamespace<SignalingLobby>;
  TURN_CREDENTIAL_TTL_SECONDS: string;
  TURN_KEY_API_TOKEN: string;
  TURN_KEY_ID: string;
}

type SocketAttachment = SignalingMember & {
  ipAddress: string;
  messageCount: number;
  messageWindowStartedAt: number;
};

type SocketSession = {
  attachment: SocketAttachment;
  socket: WebSocket;
};

export class SignalingLobby extends DurableObject<Env> {
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/stats') {
      const sessions = this.#getSessions();
      return jsonResponse({
        connections: sessions.length,
        ...getRoomStats(toMembers(sessions)),
      });
    }

    if (url.pathname !== '/ws') {
      return new Response('Not found', { status: 404 });
    }

    if (
      request.method !== 'GET' ||
      request.headers.get('upgrade')?.toLowerCase() !== 'websocket'
    ) {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }

    const ipAddress = getClientIp(request);
    const sessions = this.#getSessions();
    const activeConnections = sessions.filter(
      (session) => session.attachment.ipAddress === ipAddress,
    ).length;

    if (activeConnections >= MAX_CONNECTIONS_PER_IP) {
      return jsonResponse(
        { error: 'Too many signaling connections' },
        { status: 429 },
      );
    }

    let sessionConfig: SessionConfig;

    try {
      sessionConfig = await issueCloudflareTurnConfig(this.env);
    } catch (error) {
      console.error('Could not issue Cloudflare TURN credentials', error);
      return jsonResponse(
        { error: 'Realtime connectivity is temporarily unavailable' },
        { status: 503 },
      );
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const now = Date.now();
    const attachment: SocketAttachment = {
      id: crypto.randomUUID(),
      ipAddress,
      messageCount: 0,
      messageWindowStartedAt: now,
      role: null,
      roomCode: null,
      roomExpiresAt: null,
    };

    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);
    server.send(
      encodeServerSignalingMessage({
        type: 'session-config',
        ...sessionConfig,
      }),
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, message: ArrayBuffer | string) {
    const attachment =
      socket.deserializeAttachment() as SocketAttachment | null;

    if (!attachment) {
      socket.close(1011, 'Signaling session is not initialized');
      return;
    }

    const payload =
      typeof message === 'string'
        ? message
        : new TextDecoder().decode(new Uint8Array(message));

    if (new TextEncoder().encode(payload).byteLength > MAX_PAYLOAD_BYTES) {
      socket.close(1009, 'Signaling message is too large');
      return;
    }

    const now = Date.now();

    if (
      now - attachment.messageWindowStartedAt >=
      MESSAGE_RATE_LIMIT_WINDOW_MS
    ) {
      attachment.messageCount = 0;
      attachment.messageWindowStartedAt = now;
    }

    attachment.messageCount += 1;
    socket.serializeAttachment(attachment);

    if (attachment.messageCount > MESSAGE_RATE_LIMIT) {
      sendMessage(socket, {
        type: 'error',
        code: 'RATE_LIMITED',
        message: 'Too many signaling messages',
      });
      socket.close(1008, 'Signaling rate limit exceeded');
      return;
    }

    const sessions = this.#getSessions();
    const result = handleSignalingPayload(
      toMembers(sessions),
      attachment.id,
      payload,
      { now },
    );
    this.#applyResult(sessions, result);
    await this.#scheduleNextExpiration(result.members);
  }

  async webSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean,
  ) {
    await this.#disconnect(socket);
    socket.close(code, reason);
  }

  async webSocketError(socket: WebSocket, error: unknown) {
    console.error('Signaling WebSocket failed', error);
    await this.#disconnect(socket);
    socket.close(1011, 'Signaling connection failed');
  }

  async alarm() {
    const sessions = this.#getSessions();
    const result = expireSignalingRooms(toMembers(sessions));
    this.#applyResult(sessions, result);
    await this.#scheduleNextExpiration(result.members);
  }

  async #disconnect(socket: WebSocket) {
    const attachment =
      socket.deserializeAttachment() as SocketAttachment | null;

    if (!attachment) {
      return;
    }

    const sessions = this.#getSessions();
    const result = disconnectSignalingMember(
      toMembers(sessions),
      attachment.id,
    );
    this.#applyResult(sessions, result);
    await this.#scheduleNextExpiration(result.members);
  }

  #getSessions(): SocketSession[] {
    const sessions: SocketSession[] = [];

    for (const socket of this.ctx.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null;

      if (attachment?.id) {
        sessions.push({ attachment, socket });
      }
    }

    return sessions;
  }

  #applyResult(sessions: SocketSession[], result: CoordinationResult) {
    const membersById = new Map(
      result.members.map((member) => [member.id, member]),
    );
    const socketsById = new Map(
      sessions.map((session) => [session.attachment.id, session.socket]),
    );

    for (const session of sessions) {
      const member = membersById.get(session.attachment.id);

      if (!member || hasSameMembership(session.attachment, member)) {
        continue;
      }

      session.socket.serializeAttachment({
        ...session.attachment,
        role: member.role,
        roomCode: member.roomCode,
        roomExpiresAt: member.roomExpiresAt,
      } satisfies SocketAttachment);
    }

    deliverMessages(socketsById, result.deliveries);
  }

  async #scheduleNextExpiration(members: readonly SignalingMember[]) {
    const nextExpiration = getNextRoomExpiration(members);

    if (nextExpiration === null) {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    await this.ctx.storage.setAlarm(nextExpiration);
  }
}

function toMembers(sessions: readonly SocketSession[]): SignalingMember[] {
  return sessions.map(({ attachment }) => ({
    id: attachment.id,
    role: attachment.role,
    roomCode: attachment.roomCode,
    roomExpiresAt: attachment.roomExpiresAt,
  }));
}

function hasSameMembership(
  attachment: SocketAttachment,
  member: SignalingMember,
) {
  return (
    attachment.role === member.role &&
    attachment.roomCode === member.roomCode &&
    attachment.roomExpiresAt === member.roomExpiresAt
  );
}

function deliverMessages(
  socketsById: ReadonlyMap<string, WebSocket>,
  deliveries: readonly SignalingDelivery[],
) {
  for (const delivery of deliveries) {
    const socket = socketsById.get(delivery.recipientId);

    if (socket) {
      sendMessage(socket, delivery.message);
    }
  }
}

function sendMessage(socket: WebSocket, message: ServerSignalingMessage) {
  try {
    socket.send(encodeServerSignalingMessage(message));
  } catch (error) {
    console.error('Could not deliver signaling message', error);
    socket.close(1011, 'Signaling delivery failed');
  }
}

function getClientIp(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local-client'
  ).slice(0, 64);
}

function jsonResponse(body: unknown, { status }: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json',
    },
  });
}
