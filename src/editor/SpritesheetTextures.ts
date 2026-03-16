import type { SourceRect } from '../systems/level/LevelLoader';

export type SpritesheetSprite = {
  readonly name: string;
  readonly sourceRect: SourceRect;
};

export type SpritesheetDefinition = {
  readonly textureKey: string;
  readonly sprites: readonly SpritesheetSprite[];
};

export const SPRITESHEET_TEXTURES: readonly SpritesheetDefinition[] = [
  {
    textureKey: 'wilds_props',
    sprites: [
      { name: 'tall_grass', sourceRect: { x: 20, y: 205, width: 236, height: 184 } },
      { name: 'dry_brush', sourceRect: { x: 256, y: 277, width: 256, height: 111 } },
      { name: 'ground_cover', sourceRect: { x: 512, y: 291, width: 256, height: 91 } },
      { name: 'flower_bush', sourceRect: { x: 768, y: 218, width: 256, height: 171 } },
      { name: 'dead_tree', sourceRect: { x: 1024, y: 238, width: 256, height: 151 } },
      { name: 'moss_patch', sourceRect: { x: 1280, y: 276, width: 228, height: 112 } },
      { name: 'tree_stump', sourceRect: { x: 18, y: 610, width: 238, height: 163 } },
      { name: 'fallen_log_1', sourceRect: { x: 256, y: 681, width: 256, height: 91 } },
      { name: 'fallen_log_2', sourceRect: { x: 512, y: 671, width: 256, height: 99 } },
      { name: 'skull_bones', sourceRect: { x: 768, y: 653, width: 256, height: 117 } },
      { name: 'rock_cairn', sourceRect: { x: 1024, y: 622, width: 256, height: 151 } },
      { name: 'boulder', sourceRect: { x: 1280, y: 645, width: 202, height: 130 } },
    ],
  },
] as const;
