export const SKELETON_DIFFICULTY_CONFIG = {
  easy: {
    health: 20,
    speedPxPerSec: 70,
    attackRangePx: 250,
    attackCooldownMs: 4000
  },
  medium: {
    health: 40,
    speedPxPerSec: 90,
    attackRangePx: 300,
    attackCooldownMs: 3000
  },
  hard: {
    health: 60,
    speedPxPerSec: 110,
    attackRangePx: 400,
    attackCooldownMs: 2000
  }
} as const;

export type SkeletonDifficulty = keyof typeof SKELETON_DIFFICULTY_CONFIG;

export function getSkeletonDifficultyConfig(difficulty: SkeletonDifficulty) {
  return SKELETON_DIFFICULTY_CONFIG[difficulty];
}
