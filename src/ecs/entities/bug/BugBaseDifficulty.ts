import type { EnemyDifficulty } from '../../../constants/EnemyDifficulty';

type BugBaseDifficultyConfig = {
  baseHealth: number;
  bugHealth: number;
  bugSpeed: number;
  spawnIntervalMs: number;
}

const DIFFICULTY_CONFIGS: Record<EnemyDifficulty, BugBaseDifficultyConfig> = {
  easy: {
    baseHealth: 50,
    bugHealth: 1,
    bugSpeed: 100,
    spawnIntervalMs: 4000
  },
  medium: {
    baseHealth: 75,
    bugHealth: 1,
    bugSpeed: 150,
    spawnIntervalMs: 3000
  },
  hard: {
    baseHealth: 100,
    bugHealth: 1,
    bugSpeed: 200,
    spawnIntervalMs: 2000
  }
};

export function getBugBaseDifficultyConfig(difficulty: EnemyDifficulty): BugBaseDifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}
