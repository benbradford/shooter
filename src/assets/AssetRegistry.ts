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
  // Add more assets here as needed
  // enemy: { key: 'enemy', path: '...', type: 'spritesheet' as const, config: {...} },
  // bullet: { key: 'bullet', path: '...', type: 'image' as const },
};

export type AssetKey = keyof typeof ASSET_REGISTRY;
