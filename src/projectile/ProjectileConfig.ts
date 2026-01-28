import { SPRITE_SCALE } from '../constants/GameConstants';

// Projectile visual configuration
// Adjust this to scale bullets and shell casings together
export const PROJECTILE_SCALE = 1.5 * SPRITE_SCALE;

// Derived sizes
export const BULLET_DISPLAY_SIZE = 16 * PROJECTILE_SCALE;
export const SHELL_SCALE = 0.7 * PROJECTILE_SCALE;
