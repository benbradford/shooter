import type { EnemyDifficulty } from '../../../constants/EnemyDifficulty';

export type RobotDifficultyConfig = {
  health: number;
  speed: number;
  fireballDelayTime: number;
  fireballSpeed: number;
  fireballDuration: number;
  hitDuration: number;
}

export const ROBOT_DIFFICULTY_PRESETS: Record<EnemyDifficulty, RobotDifficultyConfig> = {
  easy: {
    health: 40,
    speed: 90,
    fireballDelayTime: 1500,
    fireballSpeed: 250,
    fireballDuration: 1500,
    hitDuration: 1000,
  },
  medium: {
    health: 80,
    speed: 120,
    fireballDelayTime: 1200,
    fireballSpeed: 300,
    fireballDuration: 2000,
    hitDuration: 750,
  },
  hard: {
    health: 100,
    speed: 140,
    fireballDelayTime: 800,
    fireballSpeed: 350,
    fireballDuration: 2500,
    hitDuration: 500,
  },
};

export function getRobotDifficultyConfig(difficulty: EnemyDifficulty): RobotDifficultyConfig {
  return ROBOT_DIFFICULTY_PRESETS[difficulty];
}
