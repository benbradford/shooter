// Sprite rendering depths (lowest to highest)
// Lower values render behind higher values

// Background layers
export const DEPTH_FLOOR = -1000;
export const DEPTH_WATER_TILE = -100;
export const DEPTH_GRID_GRAPHICS = -100;
export const DEPTH_OVERLAY = -100;
export const DEPTH_RIPPLE = -90;
export const DEPTH_WATER_TEXTURE = -80;
export const DEPTH_SHADOW_SWIMMING = -80;
export const DEPTH_PLAYER_SWIMMING = -70;
export const DEPTH_WATER_EDGE = -60;
export const DEPTH_EXHAUSTED_BASE = -50;
export const DEPTH_BRIDGE = -50;
export const DEPTH_PLATFORM = -50;
export const DEPTH_STAIRS = -50;
export const DEPTH_WALL = -50;
export const DEPTH_CELL_TEXTURE = -40;
export const DEPTH_EDGE_GRAPHICS = 0;
export const DEPTH_SHADOW = -10;
export const DEPTH_RENDERER_GRAPHICS = -10;
export const DEPTH_WATER_TILE_EDGE = -9;
export const DEPTH_CELL_TEXTURE_MODIFIED = -4;

// Entities
export const DEPTH_PLAYER = 0;
export const DEPTH_ENEMY = 0;
export const DEPTH_ENEMY_FLYING = 10;
export const DEPTH_PROJECTILE = 0;
export const DEPTH_PROJECTILE_FLYING = 10;
export const DEPTH_PROJECTILE_HIGH = 100;
export const DEPTH_PICKUP = 0;
export const DEPTH_SPAWN_SMOKE = 100;

// Effects
export const DEPTH_PARTICLE = 1000;
export const DEPTH_PARTICLE_BEHIND = -1;
export const DEPTH_PARTICLE_FRONT = 2000;
export const DEPTH_MIST = 1500;
export const DEPTH_HIT_FLASH = 900;

// UI
export const DEPTH_HUD = 2000;
export const DEPTH_HUD_CIRCLE = 1999;
export const DEPTH_HUD_FRONT = 2001;
export const DEPTH_HUD_OVERHEAL = 1002;
export const DEPTH_HUD_SPARKLES = 1003;
export const DEPTH_EDITOR = 1000;
export const DEPTH_EDITOR_FRONT = 1001;
export const DEPTH_EDITOR_TRIGGER = 1500;
export const DEPTH_EDITOR_HIGHLIGHT = 950;
export const DEPTH_VIGNETTE = 998;
export const DEPTH_DEBUG = 999;
export const DEPTH_DEBUG_TEXT = 10001;
export const DEPTH_FADE = 100000;
