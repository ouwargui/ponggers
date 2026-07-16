import { describe, expect, test } from 'bun:test';

import {
  AI_DIFFICULTIES,
  DEFAULT_AI_DIFFICULTY,
  resolveAiDifficultyLevel,
} from '@/game/ai/ai-difficulty';

describe('AI difficulty', () => {
  test('makes easier levels slower, less reactive, and less accurate', () => {
    expect(AI_DIFFICULTIES.easy.reactionMs).toBeGreaterThan(
      AI_DIFFICULTIES.medium.reactionMs,
    );
    expect(AI_DIFFICULTIES.medium.reactionMs).toBeGreaterThan(
      AI_DIFFICULTIES.hard.reactionMs,
    );
    expect(AI_DIFFICULTIES.easy.maxSpeed).toBeLessThan(
      AI_DIFFICULTIES.medium.maxSpeed,
    );
    expect(AI_DIFFICULTIES.medium.maxSpeed).toBeLessThan(
      AI_DIFFICULTIES.hard.maxSpeed,
    );
    expect(AI_DIFFICULTIES.easy.predictionError).toBeGreaterThan(
      AI_DIFFICULTIES.medium.predictionError,
    );
    expect(AI_DIFFICULTIES.medium.predictionError).toBeGreaterThan(
      AI_DIFFICULTIES.hard.predictionError,
    );
  });

  test('resolves route parameters and safely defaults to medium', () => {
    expect(resolveAiDifficultyLevel('easy')).toBe('easy');
    expect(resolveAiDifficultyLevel('hard')).toBe('hard');
    expect(resolveAiDifficultyLevel(['easy', 'hard'])).toBe('easy');
    expect(resolveAiDifficultyLevel('impossible')).toBe('medium');
    expect(resolveAiDifficultyLevel(undefined)).toBe('medium');
    expect(DEFAULT_AI_DIFFICULTY).toBe(AI_DIFFICULTIES.medium);
  });
});
