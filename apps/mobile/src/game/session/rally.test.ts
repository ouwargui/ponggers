import { describe, expect, test } from 'bun:test';

import {
  advanceRallyAuthority,
  createInitialRallyAuthority,
  type RallyStartedMessage,
  type ShotReturnedMessage,
  transformRallyEventForPeer,
} from '@/game/session/rally';

const started: RallyStartedMessage = {
  type: 'rally-started',
  rallyId: 1,
  shot: 0,
  playerRole: 'host',
  ball: {
    id: 'primary-ball',
    position: { x: 0.5, y: 0.5 },
    velocity: { x: 0.3, y: 0.4 },
  },
};

const returned: ShotReturnedMessage = {
  type: 'shot-returned',
  rallyId: 1,
  shot: 1,
  playerRole: 'host',
  ball: {
    id: 'primary-ball',
    position: { x: 0.62, y: 0.88 },
    velocity: { x: 0.2, y: -0.5 },
  },
  impact: {
    type: 'ball-impact',
    ballId: 'primary-ball',
    surface: 'paddle',
    playerId: 'bottom',
    normal: { x: 0, y: -1 },
    intensity: 0.7,
    tick: 220,
  },
};

describe('rally authority', () => {
  test('starts with the host defending the opening serve', () => {
    const next = advanceRallyAuthority(createInitialRallyAuthority(), started);

    expect(next).toEqual({
      status: 'playing',
      rallyId: 1,
      shot: 0,
      defenderRole: 'host',
      nextServerRole: null,
    });
  });

  test('hands defense to the other peer after each confirmed return', () => {
    const playing = advanceRallyAuthority(
      createInitialRallyAuthority(),
      started,
    );

    expect(playing && advanceRallyAuthority(playing, returned)).toEqual({
      status: 'playing',
      rallyId: 1,
      shot: 1,
      defenderRole: 'guest',
      nextServerRole: null,
    });
  });

  test('rejects duplicate, stale, and wrong-defender events', () => {
    const playing = advanceRallyAuthority(
      createInitialRallyAuthority(),
      started,
    );

    expect(playing).not.toBeNull();
    expect(playing && advanceRallyAuthority(playing, started)).toBeNull();
    expect(
      playing &&
        advanceRallyAuthority(playing, {
          ...returned,
          playerRole: 'guest',
        }),
    ).toBeNull();
    expect(
      playing && advanceRallyAuthority(playing, { ...returned, shot: 2 }),
    ).toBeNull();
  });

  test('makes the conceding peer responsible for the next serve', () => {
    const playing = advanceRallyAuthority(
      createInitialRallyAuthority(),
      started,
    );
    const conceded = playing
      ? advanceRallyAuthority(playing, {
          type: 'point-conceded',
          rallyId: 1,
          shot: 0,
          playerRole: 'host',
        })
      : null;

    expect(conceded).toEqual({
      status: 'waiting-for-serve',
      rallyId: 1,
      shot: 0,
      defenderRole: null,
      nextServerRole: 'host',
    });
  });

  test('accepts the conceding peer as the server of the next rally', () => {
    const firstRally = advanceRallyAuthority(
      createInitialRallyAuthority(),
      started,
    );
    const afterHostReturn = firstRally
      ? advanceRallyAuthority(firstRally, returned)
      : null;
    const afterGuestConcedes = afterHostReturn
      ? advanceRallyAuthority(afterHostReturn, {
          type: 'point-conceded',
          rallyId: 1,
          shot: 1,
          playerRole: 'guest',
        })
      : null;
    const nextRally = afterGuestConcedes
      ? advanceRallyAuthority(afterGuestConcedes, {
          ...started,
          rallyId: 2,
          playerRole: 'guest',
        })
      : null;

    expect(nextRally).toEqual({
      status: 'playing',
      rallyId: 2,
      shot: 0,
      defenderRole: 'guest',
      nextServerRole: null,
    });
  });

  test('mirrors a return into the receiving peer world', () => {
    expect(transformRallyEventForPeer(returned)).toEqual({
      ...returned,
      ball: {
        ...returned.ball,
        position: { x: 0.62, y: 0.12 },
        velocity: { x: 0.2, y: 0.5 },
      },
      impact: {
        ...returned.impact,
        playerId: 'top',
        normal: { x: 0, y: 1 },
      },
    });
  });
});
