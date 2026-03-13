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
  bullet_dude_sprite: {
    key: 'bullet_dude_sprite',
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
  npc1: {
    key: 'npc1',
    path: 'assets/npc/npc1/npc1_spritesheet.png',
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
  open_hand_icon: {
    key: 'open_hand_icon',
    path: 'assets/player/open_hand_icon.png',
    type: 'image' as const,
  },
  lips: {
    key: 'lips',
    path: 'assets/player/lips.png',
    type: 'image' as const,
  },
  lips_icon: {
    key: 'lips_icon',
    path: 'assets/player/lips.png',
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
  coin: {
    key: 'coin',
    path: 'assets/pickups/coin.png',
    type: 'image' as const,
  },
  medi_pack: {
    key: 'medi_pack',
    path: 'assets/pickups/medi_pack.png',
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
  arrows: {
    key: 'arrows',
    path: 'assets/player/arrows.png',
    type: 'image' as const,
  },
  thrower: {
    key: 'thrower',
    path: 'assets/thrower/thrower_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 56, frameHeight: 56 }
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
  dungeon_window: {
    key: 'dungeon_window',
    path: 'assets/cell_drawables/dungeon_window.png',
    type: 'image' as const,
  },
  dungeon_vase: {
    key: 'dungeon_vase',
    path: 'assets/breakables/dungeon_vase.png',
    type: 'image' as const,
  },
  wall_torch: {
    key: 'wall_torch',
    path: 'assets/cell_drawables/wall_torch.png',
    type: 'image' as const,
  },
  pillar: {
    key: 'pillar',
    path: 'assets/breakables/pillar.png',
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
  submerged_rock1: {
    key: 'submerged_rock1',
    path: 'assets/cell_drawables/rocks/submerged_rock1.png',
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
  stone_path_tileset: {
    key: 'stone_path_tileset',
    path: 'assets/cell_drawables/stone_path_tileset.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 64, frameHeight: 64 }
  },
  grass2_path_tileset: {
    key: 'grass2_path_tileset',
    path: 'assets/cell_drawables/grass2_path_tileset.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 64, frameHeight: 64 }
  },
  water_path_tileset: {
    key: 'water_path_tileset',
    path: 'assets/cell_drawables/water_path_tileset.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 64, frameHeight: 64 }
  },
  water_path_tileset_edges: {
    key: 'water_path_tileset_edges',
    path: 'assets/cell_drawables/water_path_tileset_edges.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 64, frameHeight: 64 }
  },
  water_path_offset_tileset: {
    key: 'water_path_offset_tileset',
    path: 'assets/cell_drawables/water_path_offset_tileset.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 64, frameHeight: 64 }
  },
  water2: {
    key: 'water2',
    path: 'assets/cell_drawables/water2.png',
    type: 'image' as const
  },
  water_splash: {
    key: 'water_splash',
    path: 'assets/cell_drawables/water_splash.png',
    type: 'image' as const
  },
  water_ripple: {
    key: 'water_ripple',
    path: 'assets/cell_drawables/water_ripple_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 430, frameHeight: 300 }
  },
  dungeon_platform: {
    key: 'dungeon_platform',
    path: 'assets/cell_drawables/dungeon_platform.png',
    type: 'image' as const
  },
  rocks1: {
    key: 'rocks1',
    path: 'assets/cell_drawables/rocks/rocks1.png',
    type: 'image' as const
  },
  rocks2: {
    key: 'rocks2',
    path: 'assets/cell_drawables/rocks/rocks2.png',
    type: 'image' as const
  },
  rocks3: {
    key: 'rocks3',
    path: 'assets/cell_drawables/rocks/rocks3.png',
    type: 'image' as const
  },
  rocks4: {
    key: 'rocks4',
    path: 'assets/cell_drawables/rocks/rocks4.png',
    type: 'image' as const
  },
  rocks5: {
    key: 'rocks5',
    path: 'assets/cell_drawables/rocks/rocks5.png',
    type: 'image' as const
  },
  rocks6: {
    key: 'rocks6',
    path: 'assets/cell_drawables/rocks/rocks6.png',
    type: 'image' as const
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
  grass_overlays: {
    key: 'grass_overlays',
    path: 'assets/cell_drawables/grass_overlays/grass_overlays_sprite_sheet.png',
    type: 'image' as const,
  },
  grass1: {
    key: 'grass1',
    path: 'assets/cell_drawables/grass1.png',
    type: 'image' as const,
  },
  grass2: {
    key: 'grass2',
    path: 'assets/cell_drawables/grass2.png',
    type: 'image' as const,
  },
  tree1: {
    key: 'tree1',
    path: 'assets/cell_drawables/tree1.png',
    type: 'image' as const,
  },
  fence1: {
    key: 'fence1',
    path: 'assets/cell_drawables/fence1.png',
    type: 'image' as const,
  },
  bush1: {
    key: 'bush1',
    path: 'assets/cell_drawables/bush1.png',
    type: 'image' as const,
  },
  bridge_v: {
    key: 'bridge_v',
    path: 'assets/cell_drawables/bridge_v.png',
    type: 'image' as const,
  },
  bridge_h: {
    key: 'bridge_h',
    path: 'assets/cell_drawables/bridge_h.png',
    type: 'image' as const,
  },
  house1: {
    key: 'house1',
    path: 'assets/cell_drawables/house1.png',
    type: 'image' as const,
  },
  house2: {
    key: 'house2',
    path: 'assets/cell_drawables/house2.png',
    type: 'image' as const,
  },
  house3: {
    key: 'house3',
    path: 'assets/cell_drawables/house3.png',
    type: 'image' as const,
  },
  bed1: {
    key: 'bed1',
    path: 'assets/interior/bed1.png',
    type: 'image' as const,
  },
  bench1: {
    key: 'bench1',
    path: 'assets/interior/bench1.png',
    type: 'image' as const,
  },
  chair1: {
    key: 'chair1',
    path: 'assets/interior/chair1.png',
    type: 'image' as const,
  },
  chair2: {
    key: 'chair2',
    path: 'assets/interior/chair2.png',
    type: 'image' as const,
  },
  fireplace1: {
    key: 'fireplace1',
    path: 'assets/interior/fireplace1.png',
    type: 'image' as const,
  },
  kitchen1: {
    key: 'kitchen1',
    path: 'assets/interior/kitchen1.png',
    type: 'image' as const,
  },
  rug1: {
    key: 'rug1',
    path: 'assets/interior/rug1.png',
    type: 'image' as const,
  },
  rug2: {
    key: 'rug2',
    path: 'assets/interior/rug2.png',
    type: 'image' as const,
  },
  rug3: {
    key: 'rug3',
    path: 'assets/interior/rug3.png',
    type: 'image' as const,
  },
  rug4: {
    key: 'rug4',
    path: 'assets/interior/rug4.png',
    type: 'image' as const,
  },
  rug5: {
    key: 'rug5',
    path: 'assets/interior/rug5.png',
    type: 'image' as const,
  },
  rug6: {
    key: 'rug6',
    path: 'assets/interior/rug6.png',
    type: 'image' as const,
  },
  rug7: {
    key: 'rug7',
    path: 'assets/interior/rug7.png',
    type: 'image' as const,
  },
  rug8: {
    key: 'rug8',
    path: 'assets/interior/rug8.png',
    type: 'image' as const,
  },
  table1: {
    key: 'table1',
    path: 'assets/interior/table1.png',
    type: 'image' as const,
  },
  table2: {
    key: 'table2',
    path: 'assets/interior/table2.png',
    type: 'image' as const,
  },
  interior6: {
    key: 'interior6',
    path: 'assets/interior/interior6.png',
    type: 'image' as const,
  },
  interior7: {
    key: 'interior7',
    path: 'assets/interior/interior7.png',
    type: 'image' as const,
  },
  interior8: {
    key: 'interior8',
    path: 'assets/interior/interior8.png',
    type: 'image' as const,
  },
  interior9: {
    key: 'interior9',
    path: 'assets/interior/interior9.png',
    type: 'image' as const,
  },
  interior_door1: {
    key: 'interior_door1',
    path: 'assets/interior/interior_door1.png',
    type: 'image' as const,
  },
  interior_door2: {
    key: 'interior_door2',
    path: 'assets/interior/interior_door2.png',
    type: 'image' as const,
  },
  skeleton: {
    key: 'skeleton',
    path: 'assets/skeleton/skeleton-spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  puma: {
    key: 'puma',
    path: 'assets/puma/puma_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  bone_small: {
    key: 'bone_small',
    path: 'assets/skeleton/bone-small.png',
    type: 'image' as const,
  },
  interior1: {
    key: 'interior1',
    path: 'assets/interior/interior1.png',
    type: 'image' as const,
  },
  interior2: {
    key: 'interior2',
    path: 'assets/interior/interior2.png',
    type: 'image' as const,
  },
  interior21: {
    key: 'interior21',
    path: 'assets/interior/interior21.png',
    type: 'image' as const,
  },
  sconce: {
    key: 'sconce',
    path: 'assets/interior/sconce_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 613, frameHeight: 672 }
  },
  sconce_flame: {
    key: 'sconce_flame',
    path: 'assets/interior/sconce_flame_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 78, frameHeight: 85 }
  },
  fire_interior: {
    key: 'fire_interior',
    path: 'assets/interior/fire_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 187, frameHeight: 151 }
  },
  sconce_bg: {
    key: 'sconce_bg',
    path: 'assets/interior/sconce_bg.png',
    type: 'image' as const,
  },
} as const;

export type AssetKey = keyof typeof ASSET_REGISTRY;

/**
 * Asset groups define which assets are needed for different entity types
 */
export const ASSET_GROUPS = {
  // Core - always loaded (HUD + universal assets)
  core: ['vignette', 'shadow', 'coin', 'medi_pack', 'smoke', 'crosshair', 'open_hand_icon', 'lips', 'lips_icon', 'slide_icon', 'arrows', 'water_ripple', 'water_splash', 'fire'] as const,

  // Player and projectiles
  player: ['attacker'] as const,

  // Enemies
  stalking_robot: ['attacker'] as const,
  floating_robot: ['floating_robot', 'exclamation', 'fireball', 'fire', 'robot_hit_particle'] as const,
  bug_base: ['bug_base', 'base_destroyed',  'bug'] as const,
  thrower: ['thrower', 'grenade'] as const,
  skeleton: ['skeleton', 'bone_small'] as const,
  puma: ['puma'] as const,
  bullet_dude: ['bullet_dude_sprite', 'rock', 'bullet_default', 'bullet_default_shell', 'smoke'] as const,

  // NPCs
  npc1: ['npc1'] as const,

  // Breakables
  breakables: ['dungeon_vase', 'pillar'] as const,

  // Editor - all textures that can be used in editor
  editor: ['dungeon_vase', 'pillar', 'door_closed', 'dungeon_door', 'dungeon_window', 'wall_torch', 'dungeon_key', 'submerged_rock1', 'stone_stairs', 'stone_wall', 'stone_floor', 'dungeon_platform', 'rocks1', 'rocks2', 'rocks3', 'rocks4', 'rocks5', 'rocks6', 'dungeon_floor', 'grass1', 'grass2', 'tree1', 'fence1', 'bush1', 'bridge_v', 'bridge_h', 'house1', 'house2', 'house3', 'interior2', 'interior21', 'interior6', 'interior_door1', 'interior_door2', 'bed1', 'bench1', 'chair1', 'chair2', 'fireplace1', 'kitchen1', 'rug1', 'rug2', 'rug3', 'rug4', 'rug5', 'rug6', 'rug7', 'rug8', 'table1', 'table2', 'sconce_bg'] as const,
} as const;

export type AssetGroupKey = keyof typeof ASSET_GROUPS;
