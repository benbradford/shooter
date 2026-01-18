export type AssetType = 'spritesheet' | 'image' | 'audio';

export interface AssetDefinition {
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
} as const;

export type AssetKey = keyof typeof ASSET_REGISTRY;
