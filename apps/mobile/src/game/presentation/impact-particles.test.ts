import { describe, expect, test } from 'bun:test';

import { getImpactParticleCount } from '@/game/presentation/impact-particles';

describe('impact particles', () => {
  test('scales spark count with collision intensity', () => {
    expect(getImpactParticleCount(0)).toBe(5);
    expect(getImpactParticleCount(0.5)).toBe(10);
    expect(getImpactParticleCount(1)).toBe(15);
  });

  test('clamps malformed intensity values', () => {
    expect(getImpactParticleCount(-10)).toBe(5);
    expect(getImpactParticleCount(10)).toBe(15);
  });
});
