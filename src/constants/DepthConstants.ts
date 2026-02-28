// Sprite rendering depths (lowest to highest)
// Lower values render behind higher values

// Background layers
export const DEPTH_FLOOR = -1000;
export const DEPTH_WATER_TILE = -100;
export const DEPTH_RIPPLE = -90;
export const DEPTH_WATER_TEXTURE = -80;
export const DEPTH_SHADOW_SWIMMING = -80;
export const DEPTH_PLAYER_SWIMMING = -70;
export const DEPTH_WATER_EDGE = -60;
export const DEPTH_BRIDGE = -50;
export const DEPTH_PLATFORM = -50;
export const DEPTH_STAIRS = -50;
export const DEPTH_WALL = -50;
export const DEPTH_CELL_TEXTURE = -40;
export const DEPTH_GRID_GRAPHICS = -100;
export const DEPTH_EDGE_GRAPHICS = 0;
export const DEPTH_SHADOW = -10;

// Entities
export const DEPTH_PLAYER = 0;
export const DEPTH_ENEMY = 0;
export const DEPTH_PROJECTILE = 0;
export const DEPTH_PICKUP = 0;

// Effects
export const DEPTH_PARTICLE = 900;
export const DEPTH_HIT_FLASH = 900;

// UI
export const DEPTH_HUD = 2000;
export const DEPTH_EDITOR = 1000;
export const DEPTH_VIGNETTE = 998;
export const DEPTH_DEBUG = 999;
