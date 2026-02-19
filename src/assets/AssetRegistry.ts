export type AssetType = 'spritesheet' | 'image' | 'audio';

export type AssetDefinition = {
  readonly key: string;
  readonly path: string;
  readonly type: AssetType;
  readonly config?: {
    frameWidth?: number;
    frameHeight?: number;
  };
}

export const ASSET_REGISTRY = {
  player: {
    key: 'player',
    path: 'assets/player/player-spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 64, frameHeight: 64 }
  },
  attacker: {
    key: 'attacker',
    path: 'assets/attacker/attacker-spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 56, frameHeight: 56 }
  },
  floating_robot: {
    key: 'floating_robot',
    path: 'assets/floating_robot/floating-robot-spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  exclamation: {
    key: 'exclamation',
    path: 'assets/floating_robot/exclamation.png',
    type: 'image' as const,
  },
  bullet_default: {
    key: 'bullet_default',
    path: 'assets/player/bullet_default.png',
    type: 'image' as const,
  },
  bullet_default_shell: {
    key: 'bullet_default_shell',
    path: 'assets/player/bullet_default_shell.png',
    type: 'image' as const,
  },
  smoke: {
    key: 'smoke',
    path: 'assets/player/smoke.png',
    type: 'image' as const,
  },
  robot_hit_particle: {
    key: 'robot_hit_particle',
    path: 'assets/floating_robot/hit_texture.png',
    type: 'image' as const,
  },
  target: {
    key: 'target',
    path: 'assets/player/target.png',
    type: 'image' as const,
  },
  crosshair: {
    key: 'crosshair',
    path: 'assets/player/punch_icon.png',
    type: 'image' as const,
  },
  slide_icon: {
    key: 'slide_icon',
    path: 'assets/player/slide_icon.png',
    type: 'image' as const,
  },
  fireball: {
    key: 'fireball',
    path: 'assets/floating_robot/fireball-spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 64, frameHeight: 64 }
  },
  fire: {
    key: 'fire',
    path: 'assets/floating_robot/fire.png',
    type: 'image' as const,
  },
  shadow: {
    key: 'shadow',
    path: 'assets/generic/shadow.png',
    type: 'image' as const,
  },
  vignette: {
    key: 'vignette',
    path: 'assets/generic/vin.png',
    type: 'image' as const,
  },

  bug: {
    key: 'bug',
    path: 'assets/bug/bug-spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  bug_base: {
    key: 'bug_base',
    path: 'assets/bug/base.png',
    type: 'image' as const,
  },
  base_destroyed: {
    key: 'base_destroyed',
    path: 'assets/bug/base_destroyed.png',
    type: 'image' as const,
  },
  base_particle: {
    key: 'base_particle',
    path: 'assets/bug/base_particle.png',
    type: 'image' as const,
  },
  arrows: {
    key: 'arrows',
    path: 'assets/player/arrows.png',
    type: 'image' as const,
  },
  thrower: {
    key: 'thrower',
    path: 'assets/thrower/thrower_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  grenade: {
    key: 'grenade',
    path: 'assets/thrower/grenade.png',
    type: 'image' as const,
  },
  door_closed: {
    key: 'door_closed',
    path: 'assets/cell_drawables/door_closed.png',
    type: 'image' as const,
  },
  dungeon_door: {
    key: 'dungeon_door',
    path: 'assets/cell_drawables/dungeon_door.png',
    type: 'image' as const,
  },
  wall_torch: {
    key: 'wall_torch',
    path: 'assets/cell_drawables/wall_torch.png',
    type: 'image' as const,
  },
  pillar: {
    key: 'pillar',
    path: 'assets/cell_drawables/pillar.png',
    type: 'image' as const,
  },
  rock: {
    key: 'rock',
    path: 'assets/generic/rock.png',
    type: 'image' as const,
  },
  dungeon_key: {
    key: 'dungeon_key',
    path: 'assets/cell_drawables/dungeon_key.png',
    type: 'image' as const,
  },
  stone_stairs: {
    key: 'stone_stairs',
    path: 'assets/cell_drawables/stone_stairs.png',
    type: 'image' as const,
  },
  stone_wall: {
    key: 'stone_wall',
    path: 'assets/cell_drawables/stone_wall.png',
    type: 'image' as const,
  },
  stone_floor: {
    key: 'stone_floor',
    path: 'assets/cell_drawables/stone_floor.png',
    type: 'image' as const,
  },
  dungeon_floor: {
    key: 'dungeon_floor',
    path: 'assets/cell_drawables/dungeon_floor.png',
    type: 'image' as const,
  },
  dungeon_overlays: {
    key: 'dungeon_overlays',
    path: 'assets/cell_drawables/dungeon_overlays_spritesheet.png',
    type: 'image' as const,
  },
  skeleton: {
    key: 'skeleton',
    path: 'assets/skeleton/skeleton-spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  bone_small: {
    key: 'bone_small',
    path: 'assets/skeleton/bone-small.png',
    type: 'image' as const,
  },
} as const;

export type AssetKey = keyof typeof ASSET_REGISTRY;

/**
 * Asset groups define which assets are needed for different entity types
 */
export const ASSET_GROUPS = {
  // Core - always loaded
  core: ['vignette', 'shadow'] as const,
  
  // Player and projectiles
  player: ['player', 'rock', 'bullet_default', 'bullet_default_shell', 'smoke', 'crosshair', 'slide_icon', 'arrows'] as const,
  
  // Enemies
  stalking_robot: ['attacker'] as const,
  floating_robot: ['floating_robot', 'exclamation', 'fireball', 'fire', 'robot_hit_particle'] as const,
  bug_base: ['bug_base', 'base_destroyed', 'base_particle', 'bug'] as const,
  thrower: ['thrower', 'grenade'] as const,
  skeleton: ['skeleton', 'bone_small'] as const,
} as const;

export type AssetGroupKey = keyof typeof ASSET_GROUPS;
