export const PUMA_DIFFICULTY_CONFIG = {
  easy: {
    health: 1,
    lookDistancePx: 500,
    detectDistancePx: 120,
    angryDurationMs: 2000,
    chaseSpeedPxPerSec: 350,
    jumpDetectDistancePx: 150,
    jumpSpeedPxPerSec: 400,
    jumpDamage: 0.5
  },
  medium: {
    health: 1,
    lookDistancePx: 600,
    detectDistancePx: 140,
    angryDurationMs: 1000,
    chaseSpeedPxPerSec: 400,
    jumpDetectDistancePx: 150,
    jumpSpeedPxPerSec: 450,
    jumpDamage: 0.75
  },
  hard: {
    health: 1,
    lookDistancePx: 700,
    detectDistancePx: 150,
    angryDurationMs: 500,
    chaseSpeedPxPerSec: 450,
    jumpDetectDistancePx: 150,
    jumpSpeedPxPerSec: 500,
    jumpDamage: 1
  }
} as const;

export type PumaDifficulty = keyof typeof PUMA_DIFFICULTY_CONFIG;

export function getPumaDifficultyConfig(difficulty: PumaDifficulty) {
  return PUMA_DIFFICULTY_CONFIG[difficulty];
}
