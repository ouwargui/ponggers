import { describe, expect, test } from 'bun:test';

import type { SessionMessage } from '@/game/session/protocol';
import {
  type SessionDataChannel,
  WebRtcSessionTransport,
} from '@/game/session/web-rtc-transport';

type ChannelEventType = 'open' | 'close' | 'error' | 'message';
type ChannelListener = (event: { data?: unknown }) => void;

class FakeDataChannel implements SessionDataChannel {
  readonly sentPayloads: string[] = [];
  readonly #listeners = new Map<ChannelEventType, Set<ChannelListener>>();
  readyState = 'connecting';
  rejectsSends = false;

  constructor(readonly label: string) {}

  addEventListener(type: ChannelEventType, listener: ChannelListener) {
    const listeners = this.#listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(type, listeners);
  }

  removeEventListener(type: ChannelEventType, listener: ChannelListener) {
    this.#listeners.get(type)?.delete(listener);
  }

  send(payload: string) {
    if (this.readyState !== 'open' || this.rejectsSends) {
      throw new Error('DataChannel is not open');
    }

    this.sentPayloads.push(payload);
  }

  close() {
    this.readyState = 'closed';
    this.emit('close');
  }

  open() {
    this.readyState = 'open';
    this.emit('open');
  }

  receive(data: unknown) {
    this.emit('message', { data });
  }

  fail() {
    this.emit('error');
  }

  private emit(type: ChannelEventType, event: { data?: unknown } = {}) {
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe('WebRTC session transport', () => {
  test('opens with the DataChannel and serializes protocol messages', () => {
    const transport = new WebRtcSessionTransport();
    const reliable = new FakeDataChannel('ponggers-reliable');
    const realtime = new FakeDataChannel('ponggers-realtime');
    const states: string[] = [];
    transport.subscribeState((state) => states.push(state));
    transport.attachDataChannel('reliable', reliable);
    transport.attachDataChannel('realtime', realtime);

    expect(transport.state).toBe('connecting');
    expect(transport.send({ type: 'ping', id: 1 })).toBe(false);

    reliable.open();

    expect(transport.state).toBe('connecting');

    realtime.open();

    expect(transport.state).toBe('open');
    expect(states).toEqual(['open']);
    expect(transport.send({ type: 'ping', id: 1 })).toBe(true);
    expect(reliable.sentPayloads).toEqual(['{"type":"ping","id":1}']);
    expect(
      transport.send({
        type: 'paddle-input',
        playerId: 'bottom',
        sequence: 1,
        centerX: 0.4,
        velocityX: 0.2,
        clientTick: 10,
      }),
    ).toBe(true);
    expect(realtime.sentPayloads).toEqual([
      '{"type":"paddle-input","playerId":"bottom","sequence":1,"centerX":0.4,"velocityX":0.2,"clientTick":10}',
    ]);
  });

  test('decodes valid incoming messages and ignores invalid payloads', () => {
    const transport = new WebRtcSessionTransport();
    const reliable = new FakeDataChannel('ponggers-reliable');
    const realtime = new FakeDataChannel('ponggers-realtime');
    const received: SessionMessage[] = [];
    transport.attachDataChannel('reliable', reliable);
    transport.attachDataChannel('realtime', realtime);
    transport.subscribe((message) => received.push(message));
    reliable.open();
    realtime.open();

    reliable.receive('{"type":"pong","id":4}');
    reliable.receive('{"type":"pong","id":-1}');
    realtime.receive('{"type":"pong","id":5}');
    reliable.receive(new Uint8Array());

    expect(received).toEqual([{ type: 'pong', id: 4 }]);
  });

  test('surfaces channel failure and closes cleanly', () => {
    const transport = new WebRtcSessionTransport();
    const reliable = new FakeDataChannel('ponggers-reliable');
    const realtime = new FakeDataChannel('ponggers-realtime');
    const states: string[] = [];
    transport.subscribeState((state) => states.push(state));
    transport.attachDataChannel('reliable', reliable);
    transport.attachDataChannel('realtime', realtime);
    reliable.open();
    realtime.open();
    reliable.fail();

    expect(transport.state).toBe('failed');
    transport.handlePeerConnectionState('connecting');
    reliable.open();
    expect(transport.state).toBe('failed');

    transport.close();

    expect(transport.state).toBe('closed');
    expect(reliable.readyState).toBe('closed');
    expect(realtime.readyState).toBe('closed');
    expect(states).toEqual(['open', 'failed', 'closed']);
  });

  test('queues reliable events but drops realtime input while reconnecting', () => {
    const transport = new WebRtcSessionTransport();
    const reliable = new FakeDataChannel('ponggers-reliable');
    const realtime = new FakeDataChannel('ponggers-realtime');
    transport.attachDataChannel('reliable', reliable);
    transport.attachDataChannel('realtime', realtime);
    reliable.open();
    realtime.open();
    transport.handlePeerConnectionState('disconnected');
    reliable.rejectsSends = true;

    expect(
      transport.send({
        type: 'point-conceded',
        rallyId: 1,
        shot: 2,
        playerRole: 'guest',
      }),
    ).toBe(true);
    expect(
      transport.send({
        type: 'paddle-input',
        playerId: 'bottom',
        sequence: 2,
        centerX: 0.7,
        velocityX: 0.1,
        clientTick: 20,
      }),
    ).toBe(false);
    expect(reliable.sentPayloads).toHaveLength(0);
    expect(realtime.sentPayloads).toHaveLength(0);

    reliable.rejectsSends = false;
    transport.handlePeerConnectionState('connected');

    expect(transport.state).toBe('open');
    expect(reliable.sentPayloads).toEqual([
      '{"type":"point-conceded","rallyId":1,"shot":2,"playerRole":"guest"}',
    ]);
  });
});
