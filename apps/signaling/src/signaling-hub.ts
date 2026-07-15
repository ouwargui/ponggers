import {
  decodeClientSignalingMessage,
  type ServerSignalingMessage,
  type SignalingRole,
} from '@ponggers/signaling-protocol';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ROOM_COUNT = 10_000;
const ROOM_CODE_ATTEMPTS = 32;

export type SignalingClient = {
  id: string;
  send(message: ServerSignalingMessage): void;
};

type Room = {
  code: string;
  host: SignalingClient;
  guest: SignalingClient | null;
};

type Membership = {
  role: SignalingRole;
  roomCode: string;
};

type SignalingHubOptions = {
  createRoomCode?: () => string;
  maxRoomCount?: number;
};

export class SignalingHub {
  readonly #rooms = new Map<string, Room>();
  readonly #memberships = new Map<string, Membership>();
  readonly #createRoomCode: () => string;
  readonly #maxRoomCount: number;

  constructor({
    createRoomCode = generateRoomCode,
    maxRoomCount = MAX_ROOM_COUNT,
  }: SignalingHubOptions = {}) {
    this.#createRoomCode = createRoomCode;
    this.#maxRoomCount = maxRoomCount;
  }

  handle(client: SignalingClient, payload: string) {
    const message = decodeClientSignalingMessage(payload);

    if (!message) {
      this.#sendError(client, 'INVALID_MESSAGE', 'Invalid signaling message');
      return;
    }

    if (message.type === 'create-room') {
      this.#createRoom(client);
      return;
    }

    if (message.type === 'join-room') {
      this.#joinRoom(client, message.roomCode);
      return;
    }

    if (message.type === 'signal') {
      this.#relaySignal(client, message.signal);
      return;
    }

    this.disconnect(client);
  }

  disconnect(client: SignalingClient) {
    const membership = this.#memberships.get(client.id);

    if (!membership) {
      return;
    }

    const room = this.#rooms.get(membership.roomCode);
    this.#memberships.delete(client.id);
    this.#rooms.delete(membership.roomCode);

    if (!room) {
      return;
    }

    const peer = membership.role === 'host' ? room.guest : room.host;

    if (peer) {
      this.#memberships.delete(peer.id);
      peer.send({ type: 'peer-left' });
    }
  }

  #createRoom(client: SignalingClient) {
    if (this.#memberships.has(client.id)) {
      this.#sendError(client, 'ALREADY_IN_ROOM', 'Already connected to a room');
      return;
    }

    if (this.#rooms.size >= this.#maxRoomCount) {
      this.#sendError(
        client,
        'SERVER_FULL',
        'No rooms are available right now',
      );
      return;
    }

    const roomCode = this.#findAvailableRoomCode();

    if (!roomCode) {
      this.#sendError(client, 'SERVER_FULL', 'Could not allocate a room code');
      return;
    }

    this.#rooms.set(roomCode, { code: roomCode, host: client, guest: null });
    this.#memberships.set(client.id, { role: 'host', roomCode });
    client.send({ type: 'room-created', roomCode });
  }

  #joinRoom(client: SignalingClient, roomCode: string) {
    if (this.#memberships.has(client.id)) {
      this.#sendError(client, 'ALREADY_IN_ROOM', 'Already connected to a room');
      return;
    }

    const room = this.#rooms.get(roomCode);

    if (!room) {
      this.#sendError(client, 'ROOM_NOT_FOUND', 'Room not found');
      return;
    }

    if (room.guest) {
      this.#sendError(client, 'ROOM_FULL', 'Room already has two players');
      return;
    }

    room.guest = client;
    this.#memberships.set(client.id, { role: 'guest', roomCode });
    client.send({ type: 'room-joined', roomCode });
    room.host.send({ type: 'peer-joined' });
  }

  #relaySignal(client: SignalingClient, signal: string) {
    const membership = this.#memberships.get(client.id);

    if (!membership) {
      this.#sendError(client, 'NOT_IN_ROOM', 'Join a room before signaling');
      return;
    }

    const room = this.#rooms.get(membership.roomCode);
    const peer =
      membership.role === 'host' ? room?.guest : (room?.host ?? null);

    if (!peer) {
      this.#sendError(client, 'PEER_NOT_READY', 'Opponent has not joined yet');
      return;
    }

    peer.send({ type: 'signal', signal });
  }

  #findAvailableRoomCode() {
    for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
      const roomCode = this.#createRoomCode();

      if (!this.#rooms.has(roomCode)) {
        return roomCode;
      }
    }

    return null;
  }

  #sendError(
    client: SignalingClient,
    code: Extract<ServerSignalingMessage, { type: 'error' }>['code'],
    message: string,
  ) {
    client.send({ type: 'error', code, message });
  }
}

function generateRoomCode() {
  let result = '';

  for (let index = 0; index < 6; index += 1) {
    result +=
      ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }

  return result;
}
