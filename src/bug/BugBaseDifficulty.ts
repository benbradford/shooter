export type BugBaseDifficulty = 'easy' | 'medium' | 'hard';

interface BugBaseDifficultyConfig {
  baseHealth: number;
  bugHealth: number;
  bugSpeed: number;
  spawnIntervalMs: number;
}

const DIFFICULTY_CONFIGS: Record<BugBaseDifficulty, BugBaseDifficultyConfig> = {
  easy: {
    baseHealth: 100,
    bugHealth: 20,
    bugSpeed: 100,
    spawnIntervalMs: 4000
  },
  medium: {
    baseHealth: 150,
    bugHealth: 30,
    bugSpeed: 150,
    spawnIntervalMs: 3000
  },
  hard: {
    baseHealth: 200,
    bugHealth: 40,
    bugSpeed: 200,
    spawnIntervalMs: 2000
  }
};

export function getBugBaseDifficultyConfig(difficulty: BugBaseDifficulty): BugBaseDifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}
