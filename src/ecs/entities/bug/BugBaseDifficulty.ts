import type { EnemyDifficulty } from '../../../constants/EnemyDifficulty';

type BugBaseDifficultyConfig = {
  baseHealth: number;
  bugHealth: number;
  bugSpeed: number;
  spawnIntervalMs: number;
}

const DIFFICULTY_CONFIGS: Record<EnemyDifficulty, BugBaseDifficultyConfig> = {
  easy: {
    baseHealth: 200,
    bugHealth: 1,
    bugSpeed: 100,
    spawnIntervalMs: 3000
  },
  medium: {
    baseHealth: 300,
    bugHealth: 1,
    bugSpeed: 150,
    spawnIntervalMs: 2000
  },
  hard: {
    baseHealth: 400,
    bugHealth: 1,
    bugSpeed: 200,
    spawnIntervalMs: 1000
  }
};

export function getBugBaseDifficultyConfig(difficulty: EnemyDifficulty): BugBaseDifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}
