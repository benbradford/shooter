export type BugBaseDifficulty = 'easy' | 'medium' | 'hard';

interface BugBaseDifficultyConfig {
  baseHealth: number;
  bugHealth: number;
  bugSpeed: number;
  spawnIntervalMs: number;
}

const DIFFICULTY_CONFIGS: Record<BugBaseDifficulty, BugBaseDifficultyConfig> = {
  easy: {
    baseHealth: 200,
    bugHealth: 20,
    bugSpeed: 100,
    spawnIntervalMs: 3000
  },
  medium: {
    baseHealth: 300,
    bugHealth: 30,
    bugSpeed: 150,
    spawnIntervalMs: 2000
  },
  hard: {
    baseHealth: 400,
    bugHealth: 50,
    bugSpeed: 200,
    spawnIntervalMs: 1000
  }
};

export function getBugBaseDifficultyConfig(difficulty: BugBaseDifficulty): BugBaseDifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}
