export type SourceRect = { x: number; y: number; width: number; height: number };

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
      { name: 'ground_cover', sourceRect: { x: 455, y: 291, width: 256, height: 91 }, scaleX: 2, scaleY: 1 },
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
  {
    textureKey: 'rocks_spritesheet2',
    sprites: [
      // Row 1
      { name: 'round_rock_1', sourceRect: { x: 30, y: 30, width: 320, height: 210 } },
      { name: 'round_rock_2', sourceRect: { x: 400, y: 30, width: 320, height: 210 } },
      { name: 'round_rock_3', sourceRect: { x: 780, y: 30, width: 320, height: 210 } },
      { name: 'round_rock_4', sourceRect: { x: 1150, y: 30, width: 340, height: 210 } },
      // Row 2
      { name: 'round_rock_5', sourceRect: { x: 30, y: 270, width: 300, height: 200 } },
      { name: 'round_rock_6', sourceRect: { x: 390, y: 270, width: 310, height: 200 } },
      { name: 'round_rock_7', sourceRect: { x: 770, y: 270, width: 330, height: 200 } },
      { name: 'round_rock_8', sourceRect: { x: 1140, y: 270, width: 350, height: 200 } },
      // Row 3
      { name: 'round_rock_9', sourceRect: { x: 20, y: 510, width: 320, height: 220 } },
      { name: 'round_rock_10', sourceRect: { x: 380, y: 520, width: 330, height: 210 } },
      { name: 'round_rock_11', sourceRect: { x: 760, y: 510, width: 350, height: 220 } },
      { name: 'round_rock_12', sourceRect: { x: 1140, y: 510, width: 360, height: 220 } },
      // Row 4
      { name: 'round_rock_13', sourceRect: { x: 50, y: 770, width: 260, height: 200 } },
      { name: 'round_rock_14', sourceRect: { x: 370, y: 760, width: 370, height: 220 } },
      { name: 'round_rock_15', sourceRect: { x: 770, y: 760, width: 350, height: 220 } },
      { name: 'round_rock_16', sourceRect: { x: 1150, y: 770, width: 340, height: 210 } },
    ],
  },
  {
    textureKey: 'roots_spritesheet',
    sprites: [
      // Row 1
      { name: 'root_stump_mossy', sourceRect: { x: 51, y: 52, width: 267, height: 132 } },
      { name: 'root_arch', sourceRect: { x: 332, y: 76, width: 244, height: 95 } },
      { name: 'root_twisted_stump', sourceRect: { x: 589, y: 48, width: 131, height: 130 } },
      { name: 'root_spiral', sourceRect: { x: 737, y: 59, width: 279, height: 109 } },
      { name: 'root_sprawl_flat', sourceRect: { x: 1033, y: 73, width: 211, height: 96 } },
      { name: 'root_low_spread', sourceRect: { x: 1259, y: 100, width: 244, height: 62 } },
      // Row 2
      { name: 'root_cave_hole', sourceRect: { x: 25, y: 261, width: 291, height: 102 } },
      { name: 'root_tangle_mossy', sourceRect: { x: 335, y: 268, width: 279, height: 88 } },
      { name: 'root_upright_stump', sourceRect: { x: 627, y: 218, width: 204, height: 144 } },
      { name: 'root_dark_pit', sourceRect: { x: 850, y: 257, width: 335, height: 111 } },
      { name: 'root_mound', sourceRect: { x: 1203, y: 261, width: 274, height: 93 } },
      // Row 3
      { name: 'root_rocky_base', sourceRect: { x: 25, y: 439, width: 285, height: 133 } },
      { name: 'root_mossy_tangle', sourceRect: { x: 339, y: 463, width: 283, height: 92 } },
      { name: 'root_hollow_stump', sourceRect: { x: 642, y: 448, width: 284, height: 112 } },
      { name: 'root_reaching', sourceRect: { x: 948, y: 445, width: 275, height: 100 } },
      { name: 'root_cluster', sourceRect: { x: 1269, y: 453, width: 185, height: 92 } },
      // Row 4
      { name: 'root_stone_weave', sourceRect: { x: 41, y: 629, width: 262, height: 115 } },
      { name: 'root_wide_spread', sourceRect: { x: 310, y: 631, width: 304, height: 108 } },
      { name: 'root_flat_tangle', sourceRect: { x: 622, y: 649, width: 384, height: 76 } },
      { name: 'root_broken_stump', sourceRect: { x: 1006, y: 622, width: 187, height: 118 } },
      { name: 'root_debris', sourceRect: { x: 1233, y: 626, width: 235, height: 112 } },
      // Row 5
      { name: 'root_rocky_pile', sourceRect: { x: 30, y: 792, width: 292, height: 130 } },
      { name: 'root_tangled_mass', sourceRect: { x: 324, y: 805, width: 265, height: 115 } },
      { name: 'root_long_crawl', sourceRect: { x: 591, y: 793, width: 486, height: 111 } },
      { name: 'root_mossy_crawl', sourceRect: { x: 1095, y: 807, width: 224, height: 104 } },
      { name: 'root_small_knot', sourceRect: { x: 1344, y: 814, width: 145, height: 89 } },
    ],
  },
  {
    textureKey: 'roots_spritesheet2',
    sprites: [
      // Row 1
      { name: 'root2_branch_twisted', sourceRect: { x: 80, y: 83, width: 320, height: 117 } },
      { name: 'root2_branch_forked', sourceRect: { x: 466, y: 98, width: 307, height: 97 } },
      { name: 'root2_branch_reaching', sourceRect: { x: 832, y: 71, width: 356, height: 158 } },
      { name: 'root2_branch_gnarled', sourceRect: { x: 1228, y: 73, width: 237, height: 142 } },
      // Row 2
      { name: 'root2_limb_curved', sourceRect: { x: 90, y: 305, width: 302, height: 96 } },
      { name: 'root2_limb_split', sourceRect: { x: 488, y: 279, width: 278, height: 101 } },
      { name: 'root2_limb_wide', sourceRect: { x: 856, y: 307, width: 280, height: 120 } },
      { name: 'root2_limb_hooked', sourceRect: { x: 1217, y: 272, width: 247, height: 150 } },
      // Row 3
      { name: 'root2_snag_bent', sourceRect: { x: 89, y: 487, width: 279, height: 102 } },
      { name: 'root2_snag_crooked', sourceRect: { x: 450, y: 475, width: 306, height: 92 } },
      { name: 'root2_snag_tangled', sourceRect: { x: 840, y: 475, width: 261, height: 131 } },
      { name: 'root2_snag_jagged', sourceRect: { x: 1166, y: 481, width: 314, height: 113 } },
      // Row 4
      { name: 'root2_knot_sprawl', sourceRect: { x: 67, y: 672, width: 277, height: 118 } },
      { name: 'root2_knot_tangled', sourceRect: { x: 458, y: 669, width: 299, height: 121 } },
      { name: 'root2_knot_gnarled', sourceRect: { x: 847, y: 683, width: 249, height: 117 } },
      { name: 'root2_knot_twisted', sourceRect: { x: 1161, y: 657, width: 289, height: 142 } },
    ],
  },
  {
    textureKey: 'roots_chest',
    sprites: [
      { name: 'chest_closed', sourceRect: { x: 182, y: 175, width: 384, height: 264 } },
      { name: 'chest_cracking', sourceRect: { x: 570, y: 172, width: 387, height: 268 } },
      { name: 'chest_breaking', sourceRect: { x: 1011, y: 172, width: 434, height: 271 } },
      { name: 'chest_open_glow', sourceRect: { x: 169, y: 607, width: 420, height: 248 } },
      { name: 'chest_open_particles', sourceRect: { x: 587, y: 604, width: 386, height: 252 } },
      { name: 'chest_empty', sourceRect: { x: 1031, y: 716, width: 410, height: 140 } },
    ],
  },
] as const;
