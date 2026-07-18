import { describe, expect, test } from 'bun:test';

import {
  getCenteredHudTranslateY,
  HUD_SIDE_AXIS_OFFSET_Y,
} from '@/game/presentation/hud-layout';

describe('HUD side-axis layout', () => {
  test('centers controls of different heights on the same axis', () => {
    expect(getCenteredHudTranslateY(44) + 44 / 2).toBe(
      HUD_SIDE_AXIS_OFFSET_Y,
    );
    expect(getCenteredHudTranslateY(46) + 46 / 2).toBe(
      HUD_SIDE_AXIS_OFFSET_Y,
    );
  });
});
