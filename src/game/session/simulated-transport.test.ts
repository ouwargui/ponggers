import { describe, expect, test } from 'bun:test';

import type { SessionMessage } from '@/game/session/protocol';
import {
  createSimulatedTransportPair,
  type TransportScheduler,
} from '@/game/session/simulated-transport';

type ManualTask = {
  id: number;
  runsAt: number;
  run: () => void;
  cancelled: boolean;
};

class ManualScheduler implements TransportScheduler {
  now = 0;
  #nextId = 0;
  #tasks: ManualTask[] = [];

  schedule(delayMs: number, run: () => void) {
    const task = {
      id: this.#nextId,
      runsAt: this.now + delayMs,
      run,
      cancelled: false,
    };

    this.#nextId += 1;
    this.#tasks.push(task);

    return () => {
      task.cancelled = true;
    };
  }

  advanceBy(durationMs: number) {
    const targetTime = this.now + durationMs;

    while (true) {
      this.#tasks.sort((left, right) =>
        left.runsAt === right.runsAt
          ? left.id - right.id
          : left.runsAt - right.runsAt,
      );
      const taskIndex = this.#tasks.findIndex(
        (task) => !task.cancelled && task.runsAt <= targetTime,
      );

      if (taskIndex === -1) {
        break;
      }

      const [task] = this.#tasks.splice(taskIndex, 1);
      this.now = task.runsAt;
      task.run();
    }

    this.now = targetTime;
    this.#tasks = this.#tasks.filter((task) => !task.cancelled);
  }
}

function createInput(sequence: number): SessionMessage {
  return {
    type: 'paddle-input',
    playerId: 'bottom',
    sequence,
    centerX: sequence / 10,
    velocityX: 0.5,
    clientTick: sequence * 4,
  };
}

function createRandomSequence(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0.5;
}

describe('simulated session transport', () => {
  test('delivers a cloned message after the configured latency', () => {
    const scheduler = new ManualScheduler();
    const { peerA, peerB } = createSimulatedTransportPair({
      latencyMs: 100,
      scheduler,
    });
    const received: SessionMessage[] = [];
    const input = createInput(1);

    peerB.subscribe((message) => received.push(message));
    expect(peerA.send(input)).toBe(true);
    input.centerX = 0.99;

    scheduler.advanceBy(99);
    expect(received).toHaveLength(0);

    scheduler.advanceBy(1);
    expect(received).toHaveLength(1);
    expect(received[0]?.centerX).toBe(0.1);
  });

  test('can produce out-of-order delivery through jitter', () => {
    const scheduler = new ManualScheduler();
    const { peerA, peerB } = createSimulatedTransportPair({
      latencyMs: 100,
      jitterMs: 50,
      random: createRandomSequence([1, 0]),
      scheduler,
    });
    const receivedSequences: number[] = [];

    peerB.subscribe((message) => receivedSequences.push(message.sequence));
    peerA.send(createInput(1));
    peerA.send(createInput(2));

    scheduler.advanceBy(150);
    expect(receivedSequences).toEqual([2, 1]);
  });

  test('drops packets according to the configured loss rate', () => {
    const scheduler = new ManualScheduler();
    const { peerA, peerB } = createSimulatedTransportPair({
      packetLoss: 0.5,
      random: createRandomSequence([0.2, 0.8]),
      scheduler,
    });
    const receivedSequences: number[] = [];

    peerB.subscribe((message) => receivedSequences.push(message.sequence));
    peerA.send(createInput(1));
    peerA.send(createInput(2));
    scheduler.advanceBy(0);

    expect(receivedSequences).toEqual([2]);
  });

  test('closes both peers and cancels in-flight delivery', () => {
    const scheduler = new ManualScheduler();
    const { peerA, peerB } = createSimulatedTransportPair({
      latencyMs: 100,
      scheduler,
    });
    const received: SessionMessage[] = [];
    const states: string[] = [];

    peerB.subscribe((message) => received.push(message));
    peerA.subscribeState((state) => states.push(`a:${state}`));
    peerB.subscribeState((state) => states.push(`b:${state}`));
    peerA.send(createInput(1));
    peerA.close();
    scheduler.advanceBy(100);

    expect(received).toEqual([]);
    expect(states).toEqual(['a:closed', 'b:closed']);
    expect(peerA.state).toBe('closed');
    expect(peerB.state).toBe('closed');
    expect(peerA.send(createInput(2))).toBe(false);
  });
});
