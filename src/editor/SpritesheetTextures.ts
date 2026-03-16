import type { SourceRect } from '../systems/level/LevelLoader';

export type SpritesheetSprite = {
  readonly name: string;
  readonly sourceRect: SourceRect;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly zOffsetOverride?: number;
};

export type SpritesheetDefinition = {
  readonly textureKey: string;
  readonly sprites: readonly SpritesheetSprite[];
};

export const SPRITESHEET_TEXTURES: readonly SpritesheetDefinition[] = [
  {
    textureKey: 'wilds_props',
    sprites: [
      { name: 'tall_grass', sourceRect: { x: -30, y: 205, width: 236, height: 184 }, scaleX: 1.6, zOffsetOverride: 10 },
      { name: 'dry_brush', sourceRect: { x: 220, y: 277, width: 256, height: 111 } },
      { name: 'ground_cover', sourceRect: { x: 455, y: 291, width: 256, height: 91}, scaleX: 2, scaleY: 1 },
      { name: 'flower_bush', sourceRect: { x: 690, y: 218, width: 256, height: 171 } },
      { name: 'dead_tree', sourceRect: { x: 920, y: 238, width: 256, height: 151 } },
      { name: 'moss_patch', sourceRect: { x: 1180, y: 276, width: 320, height: 112 } },
      { name: 'tree_stump', sourceRect: { x: 0, y: 610, width: 238, height: 163 } },
      { name: 'fallen_log_1', sourceRect: { x: 226, y: 681, width: 256, height: 91 } },
      { name: 'fallen_log_2', sourceRect: { x: 450, y: 671, width: 256, height: 99 } },
      { name: 'skull_bones', sourceRect: { x: 680, y: 653, width: 256, height: 117 } },
      { name: 'rock_cairn', sourceRect: { x: 920, y: 622, width: 256, height: 151 } },
      { name: 'boulder', sourceRect: { x: 1210, y: 645, width: 282, height: 130 } },
    ],
  },
  {
    textureKey: 'rocks_spritesheet',
    sprites: [
      { name: 'rocks1', sourceRect: { x: 0, y: 21, width: 271, height: 208 } },
      { name: 'rocks2', sourceRect: { x: 271, y: 10, width: 250, height: 219 } },
      { name: 'rocks3', sourceRect: { x: 521, y: 70, width: 305, height: 159 } },
      { name: 'rocks4', sourceRect: { x: 826, y: 0, width: 326, height: 229 } },
      { name: 'rocks5', sourceRect: { x: 1152, y: 102, width: 267, height: 127 } },
      { name: 'rocks6', sourceRect: { x: 1419, y: 90, width: 399, height: 139 } },
    ],
  },
] as const;
