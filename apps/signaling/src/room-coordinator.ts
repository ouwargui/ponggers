import {
  decodeClientSignalingMessage,
  isRoomCode,
  type ServerSignalingMessage,
  type SignalingRole,
} from '@ponggers/signaling-protocol';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_ATTEMPTS = 32;
const DEFAULT_WAITING_ROOM_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MATCH_ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_MAX_ROOM_COUNT = 10_000;

export type SignalingMember = {
  id: string;
  role: SignalingRole | null;
  roomCode: string | null;
  roomExpiresAt: number | null;
};

export type SignalingDelivery = {
  recipientId: string;
  message: ServerSignalingMessage;
};

export type CoordinationResult = {
  deliveries: SignalingDelivery[];
  members: SignalingMember[];
};

type CoordinatorOptions = {
  createRoomCode?: () => string;
  matchRoomTtlMs?: number;
  maxRoomCount?: number;
  now?: number;
  waitingRoomTtlMs?: number;
};

export function handleSignalingPayload(
  currentMembers: readonly SignalingMember[],
  clientId: string,
  payload: string,
  {
    createRoomCode = generateRoomCode,
    matchRoomTtlMs = DEFAULT_MATCH_ROOM_TTL_MS,
    maxRoomCount = DEFAULT_MAX_ROOM_COUNT,
    now = Date.now(),
    waitingRoomTtlMs = DEFAULT_WAITING_ROOM_TTL_MS,
  }: CoordinatorOptions = {},
): CoordinationResult {
  const expired = expireSignalingRooms(currentMembers, now);
  const members = expired.members;
  const deliveries = [...expired.deliveries];
  const client = members.find((member) => member.id === clientId);

  if (!client) {
    return { deliveries, members };
  }

  const message = decodeClientSignalingMessage(payload);

  if (!message) {
    deliveries.push(
      errorDelivery(clientId, 'INVALID_MESSAGE', 'Invalid signaling message'),
    );
    return { deliveries, members };
  }

  if (message.type === 'create-room') {
    if (client.role) {
      deliveries.push(
        errorDelivery(
          clientId,
          'ALREADY_IN_ROOM',
          'Already connected to a room',
        ),
      );
      return { deliveries, members };
    }

    const roomCount = members.filter((member) => member.role === 'host').length;

    if (roomCount >= maxRoomCount) {
      deliveries.push(
        errorDelivery(
          clientId,
          'SERVER_FULL',
          'No rooms are available right now',
        ),
      );
      return { deliveries, members };
    }

    const roomCode = findAvailableRoomCode(members, createRoomCode);

    if (!roomCode) {
      deliveries.push(
        errorDelivery(
          clientId,
          'SERVER_FULL',
          'Could not allocate a room code',
        ),
      );
      return { deliveries, members };
    }

    setMembership(client, 'host', roomCode, now + waitingRoomTtlMs);
    deliveries.push({
      recipientId: clientId,
      message: { type: 'room-created', roomCode },
    });
    return { deliveries, members };
  }

  if (message.type === 'join-room') {
    if (client.role) {
      deliveries.push(
        errorDelivery(
          clientId,
          'ALREADY_IN_ROOM',
          'Already connected to a room',
        ),
      );
      return { deliveries, members };
    }

    const host = members.find(
      (member) =>
        member.role === 'host' && member.roomCode === message.roomCode,
    );

    if (!host) {
      deliveries.push(
        errorDelivery(clientId, 'ROOM_NOT_FOUND', 'Room not found'),
      );
      return { deliveries, members };
    }

    const guest = members.find(
      (member) =>
        member.role === 'guest' && member.roomCode === message.roomCode,
    );

    if (guest) {
      deliveries.push(
        errorDelivery(clientId, 'ROOM_FULL', 'Room already has two players'),
      );
      return { deliveries, members };
    }

    const expiresAt = now + matchRoomTtlMs;
    setMembership(host, 'host', message.roomCode, expiresAt);
    setMembership(client, 'guest', message.roomCode, expiresAt);
    deliveries.push(
      {
        recipientId: clientId,
        message: { type: 'room-joined', roomCode: message.roomCode },
      },
      { recipientId: host.id, message: { type: 'peer-joined' } },
    );
    return { deliveries, members };
  }

  if (message.type === 'signal') {
    if (!client.role || !client.roomCode) {
      deliveries.push(
        errorDelivery(clientId, 'NOT_IN_ROOM', 'Join a room before signaling'),
      );
      return { deliveries, members };
    }

    const peer = findPeer(members, client);

    if (!peer) {
      deliveries.push(
        errorDelivery(
          clientId,
          'PEER_NOT_READY',
          'Opponent has not joined yet',
        ),
      );
      return { deliveries, members };
    }

    deliveries.push({
      recipientId: peer.id,
      message: { type: 'signal', signal: message.signal },
    });
    return { deliveries, members };
  }

  const disconnected = disconnectSignalingMember(members, clientId);
  deliveries.push(...disconnected.deliveries);
  return { deliveries, members: disconnected.members };
}

export function disconnectSignalingMember(
  currentMembers: readonly SignalingMember[],
  clientId: string,
): CoordinationResult {
  const members = cloneMembers(currentMembers);
  const client = members.find((member) => member.id === clientId);

  if (!client?.role || !client.roomCode) {
    return { deliveries: [], members };
  }

  const peer = findPeer(members, client);
  clearMembership(client);

  if (!peer) {
    return { deliveries: [], members };
  }

  clearMembership(peer);
  return {
    deliveries: [{ recipientId: peer.id, message: { type: 'peer-left' } }],
    members,
  };
}

export function expireSignalingRooms(
  currentMembers: readonly SignalingMember[],
  now = Date.now(),
): CoordinationResult {
  const members = cloneMembers(currentMembers);
  const expiredRoomCodes = new Set(
    members
      .filter(
        (member) =>
          member.roomCode &&
          member.roomExpiresAt !== null &&
          member.roomExpiresAt <= now,
      )
      .map((member) => member.roomCode as string),
  );
  const deliveries: SignalingDelivery[] = [];

  for (const member of members) {
    if (!member.roomCode || !expiredRoomCodes.has(member.roomCode)) {
      continue;
    }

    deliveries.push(errorDelivery(member.id, 'ROOM_EXPIRED', 'Room expired'));
    clearMembership(member);
  }

  return { deliveries, members };
}

export function getNextRoomExpiration(members: readonly SignalingMember[]) {
  let nextExpiration: number | null = null;

  for (const member of members) {
    if (
      member.role !== 'host' ||
      member.roomExpiresAt === null ||
      (nextExpiration !== null && member.roomExpiresAt >= nextExpiration)
    ) {
      continue;
    }

    nextExpiration = member.roomExpiresAt;
  }

  return nextExpiration;
}

export function getRoomStats(members: readonly SignalingMember[]) {
  const hosts = members.filter((member) => member.role === 'host');
  const matchedRooms = hosts.filter((host) =>
    members.some(
      (member) => member.role === 'guest' && member.roomCode === host.roomCode,
    ),
  ).length;

  return {
    matchedRooms,
    rooms: hosts.length,
    waitingRooms: hosts.length - matchedRooms,
  };
}

function cloneMembers(members: readonly SignalingMember[]) {
  return members.map((member) => ({ ...member }));
}

function findAvailableRoomCode(
  members: readonly SignalingMember[],
  createRoomCode: () => string,
) {
  const roomCodes = new Set(
    members.flatMap((member) => (member.roomCode ? [member.roomCode] : [])),
  );

  for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
    const roomCode = createRoomCode();

    if (isRoomCode(roomCode) && !roomCodes.has(roomCode)) {
      return roomCode;
    }
  }

  return null;
}

function findPeer(
  members: readonly SignalingMember[],
  client: SignalingMember,
) {
  const peerRole: SignalingRole = client.role === 'host' ? 'guest' : 'host';
  return members.find(
    (member) => member.role === peerRole && member.roomCode === client.roomCode,
  );
}

function setMembership(
  member: SignalingMember,
  role: SignalingRole,
  roomCode: string,
  roomExpiresAt: number,
) {
  member.role = role;
  member.roomCode = roomCode;
  member.roomExpiresAt = roomExpiresAt;
}

function clearMembership(member: SignalingMember) {
  member.role = null;
  member.roomCode = null;
  member.roomExpiresAt = null;
}

function errorDelivery(
  recipientId: string,
  code: Extract<ServerSignalingMessage, { type: 'error' }>['code'],
  message: string,
): SignalingDelivery {
  return {
    recipientId,
    message: { type: 'error', code, message },
  };
}

function generateRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let result = '';

  for (const value of bytes) {
    result += ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length];
  }

  return result;
}
