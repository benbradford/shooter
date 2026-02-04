export const THROWER_DIFFICULTY_CONFIG = {
  easy: {
    health: 30,
    throwDistancePx: 250,
    speedPxPerSec: 75,
    throwFrequencyMs: 6000,
    throwSpeedPxPerSec: 200
  },
  medium: {
    health: 50,
    throwDistancePx: 500,
    speedPxPerSec: 100,
    throwFrequencyMs: 4000,
    throwSpeedPxPerSec: 300
  },
  hard: {
    health: 80,
    throwDistancePx: 600,
    speedPxPerSec: 125,
    throwFrequencyMs: 2000,
    throwSpeedPxPerSec: 400
  }
} as const;

export type ThrowerDifficulty = keyof typeof THROWER_DIFFICULTY_CONFIG;

export function getThrowerDifficultyConfig(difficulty: ThrowerDifficulty) {
  return THROWER_DIFFICULTY_CONFIG[difficulty];
}
