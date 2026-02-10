export const SKELETON_DIFFICULTY_CONFIG = {
  easy: {
    health: 20,
    speedPxPerSec: 90,
    attackRangePx: 250,
    attackCooldownMs: 3000
  },
  medium: {
    health: 40,
    speedPxPerSec: 130,
    attackRangePx: 300,
    attackCooldownMs: 2000
  },
  hard: {
    health: 60,
    speedPxPerSec: 170,
    attackRangePx: 400,
    attackCooldownMs: 1500
  }
} as const;

export type SkeletonDifficulty = keyof typeof SKELETON_DIFFICULTY_CONFIG;

export function getSkeletonDifficultyConfig(difficulty: SkeletonDifficulty) {
  return SKELETON_DIFFICULTY_CONFIG[difficulty];
}
