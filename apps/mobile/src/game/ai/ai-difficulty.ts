export type AiDifficulty = {
  reactionMs: number;
  maxSpeed: number;
  predictionError: number;
  returnToCenterSpeed: number;
};

export const AI_DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

export type AiDifficultyLevel = (typeof AI_DIFFICULTY_LEVELS)[number];

export const AI_DIFFICULTIES: Record<AiDifficultyLevel, AiDifficulty> = {
  easy: {
    reactionMs: 420,
    maxSpeed: 0.38,
    predictionError: 0.42,
    returnToCenterSpeed: 0.25,
  },
  medium: {
    reactionMs: 260,
    maxSpeed: 0.62,
    predictionError: 0.3,
    returnToCenterSpeed: 0.35,
  },
  hard: {
    reactionMs: 150,
    maxSpeed: 0.9,
    predictionError: 0.12,
    returnToCenterSpeed: 0.48,
  },
};

export const DEFAULT_AI_DIFFICULTY = AI_DIFFICULTIES.medium;

export function resolveAiDifficultyLevel(
  value: string | string[] | undefined,
): AiDifficultyLevel {
  const candidate = Array.isArray(value) ? value[0] : value;

  return candidate === 'easy' || candidate === 'hard' ? candidate : 'medium';
}
