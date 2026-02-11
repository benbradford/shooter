export type BulletDudeDifficulty = 'easy' | 'medium' | 'hard';

export type BulletDudeDifficultyConfig = {
  health: number;
  stunTime: number;
  lookDistance: number;
  maxBullets: number;
  aimAccuracy: number;
  shootDelay: number;
  overheatPeriod: number;
  bulletSpeed: number;
  guardRotateSpeed: number;
};

export const BULLET_DUDE_DIFFICULTY_CONFIG: Record<BulletDudeDifficulty, BulletDudeDifficultyConfig> = {
  easy: {
    health: 30,
    stunTime: 3000,
    lookDistance: 300,
    maxBullets: 8,
    aimAccuracy: 150,
    shootDelay: 250,
    overheatPeriod: 5000,
    bulletSpeed: 400,
    guardRotateSpeed: 600,
  },
  medium: {
    health: 60,
    stunTime: 2200,
    lookDistance: 500,
    maxBullets: 16,
    aimAccuracy: 110,
    shootDelay: 200,
    overheatPeriod: 4000,
    bulletSpeed: 500,
    guardRotateSpeed: 500,
  },
  hard: {
    health: 90,
    stunTime: 1300,
    lookDistance: 700,
    maxBullets: 32,
    aimAccuracy: 75,
    shootDelay: 100,
    overheatPeriod: 3000,
    bulletSpeed: 600,
    guardRotateSpeed: 400,
  },
};

export function getBulletDudeDifficultyConfig(difficulty: BulletDudeDifficulty): BulletDudeDifficultyConfig {
  return BULLET_DUDE_DIFFICULTY_CONFIG[difficulty];
}
