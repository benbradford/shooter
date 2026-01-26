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
    path: 'assets/player/crosshair.png',
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
  dungeon_floor01: {
    key: 'dungeon_floor01',
    path: 'assets/dungeon/dungeon_floor01.png',
    type: 'image' as const,
  },
  dungeon_floor02: {
    key: 'dungeon_floor02',
    path: 'assets/dungeon/dungeon_floor02.png',
    type: 'image' as const,
  },
  wooden_floor01: {
    key: 'wooden_floor01',
    path: 'assets/wooden/wooden_floor01.png',
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
} as const;

export type AssetKey = keyof typeof ASSET_REGISTRY;
