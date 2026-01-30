export const THROWER_DIFFICULTY_CONFIG = {
  easy: {
    health: 30,
    throwDistancePx: 250,
    speedPxPerSec: 150,
    throwFrequencyMs: 6000
  },
  medium: {
    health: 50,
    throwDistancePx: 500,
    speedPxPerSec: 200,
    throwFrequencyMs: 4000
  },
  hard: {
    health: 80,
    throwDistancePx: 600,
    speedPxPerSec: 240,
    throwFrequencyMs: 2000
  }
} as const;

export type ThrowerDifficulty = keyof typeof THROWER_DIFFICULTY_CONFIG;

export function getThrowerDifficultyConfig(difficulty: ThrowerDifficulty) {
  return THROWER_DIFFICULTY_CONFIG[difficulty];
}
