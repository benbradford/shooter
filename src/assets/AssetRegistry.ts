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
  village_old_man: {
    key: 'village_old_man',
    path: 'assets/npc/village_old_man/village_old_man_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 68, frameHeight: 68 }
  },
  village_girl: {
    key: 'village_girl',
    path: 'assets/npc/village_girl/village_girl_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 68, frameHeight: 68 }
  },
  old_village_lady: {
    key: 'old_village_lady',
    path: 'assets/npc/old_village_lady/old_village_lady_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 68, frameHeight: 68 }
  },
  village_wizard: {
    key: 'village_wizard',
    path: 'assets/npc/village_wizard/village_wizard_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 68, frameHeight: 68 }
  },
  village_boy: {
    key: 'village_boy',
    path: 'assets/npc/village_boy/village_boy_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  village_swim_teacher: {
    key: 'village_swim_teacher',
    path: 'assets/npc/village_swim_teacher/village_swim_teacher_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
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
  speech_bubble: {
    key: 'speech_bubble',
    path: 'assets/player/speech_bubble.png',
    type: 'image' as const,
  },
  slide_icon: {
    key: 'slide_icon',
    path: 'assets/player/slide_icon.png',
    type: 'image' as const,
  },
  push_icon: {
    key: 'push_icon',
    path: 'assets/player/push_icon.png',
    type: 'image' as const,
  },
  jump_icon: {
    key: 'jump_icon',
    path: 'assets/player/jump_icon.png',
    type: 'image' as const,
  },
  pushing_box: {
    key: 'pushing_box',
    path: 'assets/pushables/pushing_box.png',
    type: 'image' as const,
  },
  hole_in_wall: {
    key: 'hole_in_wall',
    path: 'assets/cell_drawables/hole_in_wall.png',
    type: 'image' as const,
  },
  push_lock_depression: {
    key: 'push_lock_depression',
    path: 'assets/cell_drawables/push_lock_depression.png',
    type: 'image' as const,
  },
  grey_platform: {
    key: 'grey_platform',
    path: 'assets/cell_drawables/grey_platform.png',
    type: 'image' as const,
  },
  wall_cracked: {
    key: 'wall_cracked',
    path: 'assets/cell_drawables/wall_cracked.png',
    type: 'image' as const,
  },
  bell_bar: {
    key: 'bell_bar',
    path: 'assets/cell_drawables/bell_bar.png',
    type: 'image' as const,
  },
  bell_ding: {
    key: 'bell_ding',
    path: 'assets/sounds/bell_ding.mp3',
    type: 'audio' as const,
  },
  bell_body: {
    key: 'bell_body',
    path: 'assets/cell_drawables/bell_body.png',
    type: 'image' as const,
  },
  bell_clapper: {
    key: 'bell_clapper',
    path: 'assets/cell_drawables/bell_clapper.png',
    type: 'image' as const,
  },
  bell_cracked: {
    key: 'bell_cracked',
    path: 'assets/cell_drawables/bell_cracked.png',
    type: 'image' as const,
  },
  dead_tree1: {
    key: 'dead_tree1',
    path: 'assets/cell_drawables/dead_tree1.png',
    type: 'image' as const,
  },
  dead_tree2: {
    key: 'dead_tree2',
    path: 'assets/cell_drawables/dead_tree2.png',
    type: 'image' as const,
  },
  dead_tree3: {
    key: 'dead_tree3',
    path: 'assets/cell_drawables/dead_tree3.png',
    type: 'image' as const,
  },
  grass_overlays_faded: {
    key: 'grass_overlays_faded',
    path: 'assets/cell_drawables/grass_overlays/grass_overlays_faded_spritesheet.png',
    type: 'image' as const,
  },
  hole_with_roots: {
    key: 'hole_with_roots',
    path: 'assets/cell_drawables/hole_with_roots.png',
    type: 'image' as const,
  },
  hud_rings: {
    key: 'hud_rings',
    path: 'assets/player/hud_rings.png',
    type: 'image' as const,
  },
  stone_bg: {
    key: 'stone_bg',
    path: 'assets/player/stone_bg.png',
    type: 'image' as const,
  },
  stone_ring: {
    key: 'stone_ring',
    path: 'assets/player/stone_ring.png',
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
  narry: {
    key: 'narry',
    path: 'assets/generic/narry.png',
    type: 'image' as const,
  },
  mist_orb: {
    key: 'mist_orb',
    path: 'assets/generic/mist_orb.png',
    type: 'image' as const,
  },
  lever: {
    key: 'lever',
    path: 'assets/generic/lever.png',
    type: 'image' as const,
  },
  lever_dead: {
    key: 'lever_dead',
    path: 'assets/generic/lever_dead.png',
    type: 'image' as const,
  },
  laser_base: {
    key: 'laser_base',
    path: 'assets/generic/laser_base_only.png',
    type: 'image' as const,
  },
  laser_nozzle: {
    key: 'laser_nozzle',
    path: 'assets/generic/laser_nozzle.png',
    type: 'image' as const,
  },
  laser_base_destroyed: {
    key: 'laser_base_destroyed',
    path: 'assets/generic/laser_base_destroyed.png',
    type: 'image' as const,
  },
  shimmer1: {
    key: 'shimmer1',
    path: 'assets/sounds/shimmer1.mp3',
    type: 'audio' as const,
  },
  splash1: {
    key: 'splash1',
    path: 'assets/sounds/splash1.mp3',
    type: 'audio' as const,
  },
  splash2: {
    key: 'splash2',
    path: 'assets/sounds/splash2.mp3',
    type: 'audio' as const,
  },
  jump_hup: {
    key: 'jump_hup',
    path: 'assets/sounds/jump_hup.mp3',
    type: 'audio' as const,
  },
  player_impact1: {
    key: 'player_impact1',
    path: 'assets/sounds/player_impact1.mp3',
    type: 'audio' as const,
  },
  player_impact2: {
    key: 'player_impact2',
    path: 'assets/sounds/player_impact2.mp3',
    type: 'audio' as const,
  },
  punch1: {
    key: 'punch1',
    path: 'assets/sounds/punch1.mp3',
    type: 'audio' as const,
  },
  punch2: {
    key: 'punch2',
    path: 'assets/sounds/punch2.mp3',
    type: 'audio' as const,
  },
  punch3: {
    key: 'punch3',
    path: 'assets/sounds/punch3.mp3',
    type: 'audio' as const,
  },
  superpunch: {
    key: 'superpunch',
    path: 'assets/sounds/superpunch.mp3',
    type: 'audio' as const,
  },
  coin1_sfx: {
    key: 'coin1_sfx',
    path: 'assets/sounds/coin1.mp3',
    type: 'audio' as const,
  },
  coin2_sfx: {
    key: 'coin2_sfx',
    path: 'assets/sounds/coin2.mp3',
    type: 'audio' as const,
  },
  bark_sfx: {
    key: 'bark_sfx',
    path: 'assets/sounds/bark.mp3',
    type: 'audio' as const,
  },
  orb_sfx: {
    key: 'orb_sfx',
    path: 'assets/sounds/orb.mp3',
    type: 'audio' as const,
  },
  vase1: {
    key: 'vase1',
    path: 'assets/sounds/vase1.mp3',
    type: 'audio' as const,
  },
  vase2: {
    key: 'vase2',
    path: 'assets/sounds/vase2.mp3',
    type: 'audio' as const,
  },
  vase3: {
    key: 'vase3',
    path: 'assets/sounds/vase3.mp3',
    type: 'audio' as const,
  },
  rock_break1: {
    key: 'rock_break1',
    path: 'assets/sounds/rock_break1.mp3',
    type: 'audio' as const,
  },
  rock_break2: {
    key: 'rock_break2',
    path: 'assets/sounds/rock_break2.mp3',
    type: 'audio' as const,
  },
  thud1: {
    key: 'thud1',
    path: 'assets/sounds/thud1.mp3',
    type: 'audio' as const,
  },
  click1: {
    key: 'click1',
    path: 'assets/sounds/click1.mp3',
    type: 'audio' as const,
  },
  drag1: {
    key: 'drag1',
    path: 'assets/sounds/drag1.mp3',
    type: 'audio' as const,
  },
  drag2: {
    key: 'drag2',
    path: 'assets/sounds/drag2.mp3',
    type: 'audio' as const,
  },
  btr_music: {
    key: 'btr_music',
    path: 'assets/music/btr.mp3',
    type: 'audio' as const,
  },
  btr_overworld: {
    key: 'btr_overworld',
    path: 'assets/music/btr_overworld.mp3',
    type: 'audio' as const,
  },
  btr_wilds: {
    key: 'btr_wilds',
    path: 'assets/music/btr_wilds.mp3',
    type: 'audio' as const,
  },
  btr_tonal: {
    key: 'btr_tonal',
    path: 'assets/music/btr_tonal.mp3',
    type: 'audio' as const,
  },
  incidental: {
    key: 'incidental',
    path: 'assets/music/incidental.mp3',
    type: 'audio' as const,
  },
  capacity: {
    key: 'capacity',
    path: 'assets/music/capacity.mp3',
    type: 'audio' as const,
  },
  throw_whoosh1: {
    key: 'throw_whoosh1',
    path: 'assets/sounds/throw_whoosh1.mp3',
    type: 'audio' as const,
  },
  bones_spawn: {
    key: 'bones_spawn',
    path: 'assets/sounds/bones_spawn.mp3',
    type: 'audio' as const,
  },
  hole_stretch: {
    key: 'hole_stretch',
    path: 'assets/sounds/hole_stretch.mp3',
    type: 'audio' as const,
  },
  splatter: {
    key: 'splatter',
    path: 'assets/sounds/splatter.mp3',
    type: 'audio' as const,
  },
  rubble: {
    key: 'rubble',
    path: 'assets/sounds/rubble.mp3',
    type: 'audio' as const,
  },
  laser_burn: {
    key: 'laser_burn',
    path: 'assets/sounds/laser_burn.mp3',
    type: 'audio' as const,
  },
  skeleton_death: {
    key: 'skeleton_death',
    path: 'assets/sounds/skeleton_death.mp3',
    type: 'audio' as const,
  },
  skeleton_hit: {
    key: 'skeleton_hit',
    path: 'assets/sounds/skeleton_hit.mp3',
    type: 'audio' as const,
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
  small_mushrooms: {
    key: 'small_mushrooms',
    path: 'assets/pickups/small_mushrooms.png',
    type: 'image' as const,
  },
  roots_chest: {
    key: 'roots_chest',
    path: 'assets/pickups/roots_chest.png',
    type: 'image' as const,
  },
  drawbridge_spritesheet: {
    key: 'drawbridge_spritesheet',
    path: 'assets/cell_drawables/drawbridge_compressed_sprite_sheet.png',
    type: 'image' as const,
  },
  mushroom: {
    key: 'mushroom',
    path: 'assets/pickups/mushroom.png',
    type: 'image' as const,
  },
  boots: {
    key: 'boots',
    path: 'assets/pickups/boots.png',
    type: 'image' as const,
  },
  max_health_increase: {
    key: 'max_health_increase',
    path: 'assets/pickups/max_health_increase.png',
    type: 'image' as const,
  },
  bandage: {
    key: 'bandage',
    path: 'assets/pickups/bandage.png',
    type: 'image' as const,
  },
  autoheal: {
    key: 'autoheal',
    path: 'assets/pickups/autoheal.png',
    type: 'image' as const,
  },
  push_strength: {
    key: 'push_strength',
    path: 'assets/pickups/push_strength.png',
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
  dungeon_fence: {
    key: 'dungeon_fence',
    path: 'assets/cell_drawables/dungeon_fence.png',
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
  wilds_props: {
    key: 'wilds_props',
    path: 'assets/cell_drawables/wilds_props.png',
    type: 'image' as const,
  },
  rocks_spritesheet: {
    key: 'rocks_spritesheet',
    path: 'assets/cell_drawables/rocks_spritesheet.png',
    type: 'image' as const,
  },
  rocks_spritesheet2: {
    key: 'rocks_spritesheet2',
    path: 'assets/cell_drawables/rocks/rock_spritesheet2.png',
    type: 'image' as const,
  },
  roots_spritesheet: {
    key: 'roots_spritesheet',
    path: 'assets/cell_drawables/roots/roots_spritesheet.png',
    type: 'image' as const,
  },
  roots_spritesheet2: {
    key: 'roots_spritesheet2',
    path: 'assets/cell_drawables/roots/roots_spritesheet2.png',
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
  stone_wall2: {
    key: 'stone_wall2',
    path: 'assets/cell_drawables/stone_wall2.png',
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
   murky_water: {
    key: 'murky_water',
    path: 'assets/cell_drawables/murky_water.png',
    type: 'image' as const
  },
   water_poison: {
    key: 'water_poison',
    path: 'assets/cell_drawables/water_poison.png',
    type: 'image' as const
  },
  lava: {
    key: 'lava',
    path: 'assets/cell_drawables/lava.png',
    type: 'image' as const
  },
  ice_edge: {
    key: 'ice_edge',
    path: 'assets/cell_drawables/ice_edge.png',
    type: 'image' as const
  },
  ice_ground: {
    key: 'ice_ground',
    path: 'assets/cell_drawables/ice_ground.png',
    type: 'image' as const
  },
  ice_lake: {
    key: 'ice_lake',
    path: 'assets/cell_drawables/ice_lake.png',
    type: 'image' as const
  },
  ice_platform: {
    key: 'ice_platform',
    path: 'assets/cell_drawables/ice_platform.png',
    type: 'image' as const
  },
  ice_shoreline: {
    key: 'ice_shoreline',
    path: 'assets/cell_drawables/ice_shoreline.png',
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

    murky_splash: {
    key: 'murky_splash',
    path: 'assets/cell_drawables/murky_splash.png',
    type: 'image' as const
  },
  murky_ripple: {
    key: 'murky_ripple',
    path: 'assets/cell_drawables/murky_ripple_spritesheet.png',
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
  muddy_floor: {
    key: 'muddy_floor',
    path: 'assets/cell_drawables/muddy_floor.png',
    type: 'image' as const,
  },
  muddy_wall: {
    key: 'muddy_wall',
    path: 'assets/cell_drawables/muddy_wall.png',
    type: 'image' as const,
  },
    muddy_platform: {
    key: 'muddy_platform',
    path: 'assets/cell_drawables/muddy_platform.png',
    type: 'image' as const,
  },
    muddy_stairs: {
    key: 'muddy_stairs',
    path: 'assets/cell_drawables/muddy_stairs.png',
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
  grass_faded: {
    key: 'grass_faded',
    path: 'assets/cell_drawables/grass_faded.png',
    type: 'image' as const,
  },
  plains_grass_fill_a: {
    key: 'plains_grass_fill_a',
    path: 'assets/cell_drawables/plains_grass_fill_a.png',
    type: 'image' as const,
  },
  plains_grass_fill_b: {
    key: 'plains_grass_fill_b',
    path: 'assets/cell_drawables/plains_grass_fill_b.png',
    type: 'image' as const,
  },
  plains_pebbles_overlay: {
    key: 'plains_pebbles_overlay',
    path: 'assets/cell_drawables/plains_pebbles_overlay.png',
    type: 'image' as const,
  },
  plains_stone_path_fill: {
    key: 'plains_stone_path_fill',
    path: 'assets/cell_drawables/plains_stone_path_fill.png',
    type: 'image' as const,
  },
  plains_stone_wall_fill: {
    key: 'plains_stone_wall_fill',
    path: 'assets/cell_drawables/plains_stone_wall_fill.png',
    type: 'image' as const,
  },
  plains_wildflower_overlay: {
    key: 'plains_wildflower_overlay',
    path: 'assets/cell_drawables/plains_wildflower_overlay.png',
    type: 'image' as const,
  },
  plains_wildflower_overlay_old: {
    key: 'plains_wildflower_overlay_old',
    path: 'assets/cell_drawables/plains_wildflower_overlay_old.png',
    type: 'image' as const,
  },
  tree1: {
    key: 'tree1',
    path: 'assets/cell_drawables/tree1.png',
    type: 'image' as const,
  },
  tree2: {
    key: 'tree2',
    path: 'assets/cell_drawables/tree2.png',
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
  bush2: {
    key: 'bush2',
    path: 'assets/cell_drawables/bush2.png',
    type: 'image' as const,
  },
  flower1: {
    key: 'flower1',
    path: 'assets/cell_drawables/flower1.png',
    type: 'image' as const,
  },
  cart: {
    key: 'cart',
    path: 'assets/cell_drawables/cart.png',
    type: 'image' as const,
  },
  cart2: {
    key: 'cart2',
    path: 'assets/cell_drawables/cart2.png',
    type: 'image' as const,
  },
  well: {
    key: 'well',
    path: 'assets/cell_drawables/well.png',
    type: 'image' as const,
  },
  stone_guardian: {
    key: 'stone_guardian',
    path: 'assets/cell_drawables/stone_guardian.png',
    type: 'image' as const,
  },
  stone_lantern: {
    key: 'stone_lantern',
    path: 'assets/cell_drawables/stone_lantern.png',
    type: 'image' as const,
  },
  tile_sign: {
    key: 'tile_sign',
    path: 'assets/cell_drawables/tile_sign.png',
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
  chasm: {
    key: 'chasm',
    path: 'assets/cell_drawables/chasm.png',
    type: 'image' as const,
  },
  blank: {
    key: 'blank',
    path: 'assets/cell_drawables/blank.png',
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
  house4: {
    key: 'house4',
    path: 'assets/cell_drawables/house4.png',
    type: 'image' as const,
  },
  house5: {
    key: 'house5',
    path: 'assets/cell_drawables/house5.png',
    type: 'image' as const,
  },
  crumbled_cottage: {
    key: 'crumbled_cottage',
    path: 'assets/cell_drawables/crumbled_cottage.png',
    type: 'image' as const,
  },
  abandoned_hut: {
    key: 'abandoned_hut',
    path: 'assets/cell_drawables/abandoned_hut.png',
    type: 'image' as const,
  },
  shrine: {
    key: 'shrine',
    path: 'assets/cell_drawables/shrine.png',
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
  worm: {
    key: 'worm',
    path: 'assets/worm/worm_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  worm_spit: {
    key: 'worm_spit',
    path: 'assets/sounds/worm_spit.mp3',
    type: 'audio' as const,
  },
  beetle: {
    key: 'beetle',
    path: 'assets/beetle/beetle_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 68, frameHeight: 68 }
  },
  beetle_splat: {
    key: 'beetle_splat',
    path: 'assets/sounds/beetle_splat.mp3',
    type: 'audio' as const,
  },
  mole: {
    key: 'mole',
    path: 'assets/mole/mole_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  eye: {
    key: 'eye',
    path: 'assets/eye/eye_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  frog: {
    key: 'frog',
    path: 'assets/frog/frog_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  fly: {
    key: 'fly',
    path: 'assets/fly/fly_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
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
  tv_monk: {
    key: 'tv_monk',
    path: 'assets/tv_monk/tv_monk_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 80, frameHeight: 80 }
  },
  tv_static: {
    key: 'tv_static',
    path: 'assets/sounds/tv_static.mp3',
    type: 'audio' as const,
  },
  cat_detect: {
    key: 'cat_detect',
    path: 'assets/sounds/cat_detect.mp3',
    type: 'audio' as const,
  },
  cat_sound1: {
    key: 'cat_sound1',
    path: 'assets/sounds/cat_sound1.mp3',
    type: 'audio' as const,
  },
  cat_sound2: {
    key: 'cat_sound2',
    path: 'assets/sounds/cat_sound2.mp3',
    type: 'audio' as const,
  },
  cat_sound3: {
    key: 'cat_sound3',
    path: 'assets/sounds/cat_sound3.mp3',
    type: 'audio' as const,
  },
  cat_sound4: {
    key: 'cat_sound4',
    path: 'assets/sounds/cat_sound4.mp3',
    type: 'audio' as const,
  },
  cat_death: {
    key: 'cat_death',
    path: 'assets/sounds/cat_death.mp3',
    type: 'audio' as const,
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
  rock_spritesheet: {
    key: 'rock_spritesheet',
    path: 'assets/pets/rock/rock_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 48, frameHeight: 48 }
  },
  dog_spritesheet: {
    key: 'dog_spritesheet',
    path: 'assets/pets/dog/dog_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 32, frameHeight: 32 }
  },
  bark_icon: {
    key: 'bark_icon',
    path: 'assets/pets/dog/dog/bark_icon.png',
    type: 'image' as const,
  },
  rock_icon: {
    key: 'rock_icon',
    path: 'assets/pets/rock/rock/rock_icon.png',
    type: 'image' as const,
  },
  bubble: {
    key: 'bubble',
    path: 'assets/pets/bubble/bubble.png',
    type: 'image' as const,
  },
  fear_icon: {
    key: 'fear_icon',
    path: 'assets/pets/dog/dog/fear_icon.png',
    type: 'image' as const,
  },
  knight_spritesheet: {
    key: 'knight_spritesheet',
    path: 'assets/knight/knight_spritesheet.png',
    type: 'spritesheet' as const,
    config: { frameWidth: 68, frameHeight: 68 }
  },
} as const;

export type AssetKey = keyof typeof ASSET_REGISTRY;

/**
 * Asset groups define which assets are needed for different entity types
 */
export const ASSET_GROUPS = {
  // Core - always loaded (HUD + universal assets)
  core: ['vignette', 'shadow', 'narry', 'coin', 'mushroom', 'small_mushrooms', 'smoke', 'crosshair', 'open_hand_icon', 'lips', 'lips_icon', 'speech_bubble', 'slide_icon', 'push_icon', 'jump_icon', 'hud_rings', 'stone_ring', 'stone_bg', 'arrows', 'water_ripple', 'murky_ripple', 'water_splash', 'murky_splash', 'fire', 'rock_spritesheet', 'dog_spritesheet', 'bark_icon', 'rock_icon', 'fear_icon', 'bubble', 'mist_orb', 'shimmer1', 'splash1', 'splash2', 'jump_hup', 'player_impact1', 'player_impact2', 'punch1', 'punch2', 'punch3', 'superpunch', 'coin1_sfx', 'coin2_sfx', 'bark_sfx', 'orb_sfx', 'push_lock_depression', 'click1', 'drag1', 'drag2'] as const,

  // Player and projectiles
  player: ['attacker'] as const,

  // Enemies
  stalking_robot: ['floating_robot', 'exclamation', 'fireball', 'fire', 'robot_hit_particle'] as const,
  floating_robot: ['floating_robot', 'exclamation', 'fireball', 'fire', 'robot_hit_particle'] as const,
  bug_base: ['bug_base', 'base_destroyed', 'bug', 'hole_stretch', 'splatter', 'rubble'] as const,
  thrower: ['thrower', 'grenade'] as const,
  skeleton: ['skeleton', 'bone_small', 'throw_whoosh1', 'bones_spawn', 'skeleton_death', 'skeleton_hit'] as const,
  worm: ['worm', 'worm_spit'] as const,
  beetle: ['beetle', 'beetle_splat'] as const,
  mole: ['mole'] as const,
  eye: ['eye'] as const,
  frog: ['frog'] as const,
  fly: ['fly'] as const,
  red_skeleton: ['skeleton', 'bone_small', 'throw_whoosh1', 'bones_spawn', 'skeleton_death', 'skeleton_hit'] as const,
  puma: ['puma', 'cat_detect', 'cat_sound1', 'cat_sound2', 'cat_sound3', 'cat_sound4', 'cat_death'] as const,
  tv_monk: ['tv_monk', 'tv_static'] as const,
  bullet_dude: ['bullet_dude_sprite', 'rock', 'bullet_default', 'bullet_default_shell', 'smoke'] as const,

  // NPCs
  npc1: ['npc1'] as const,
  village_old_man: ['village_old_man'] as const,
  village_girl: ['village_girl'] as const,
  old_village_lady: ['old_village_lady'] as const,
  village_wizard: ['village_wizard'] as const,
  village_boy: ['village_boy'] as const,
  village_swim_teacher: ['village_swim_teacher'] as const,

  // Breakables
  breakables: ['dungeon_vase', 'pillar', 'vase1', 'vase2', 'vase3', 'rock_break1', 'rock_break2', 'thud1'] as const,

  // Collectibles
  collectibles: ['mist_orb'] as const,

  // Root chest
  root_chest: ['roots_chest', 'mushroom', 'boots', 'max_health_increase', 'bandage', 'autoheal', 'push_strength'] as const,

  // Lever
  lever: ['lever', 'lever_dead'] as const,

  // Laser
  laser: ['laser_base', 'laser_nozzle', 'laser_base_destroyed', 'laser_burn'] as const,

  // Escort
  escort: ['knight_spritesheet'] as const,

  // Bell
  bell: ['bell_bar', 'bell_body', 'bell_cracked', 'bell_ding'] as const,

  // Editor - all textures that can be used in editor
  editor: ['bell_bar', 'bell_body', 'bell_cracked', 'dungeon_vase', 'pillar', 'door_closed', 'dungeon_door', 'dungeon_window', 'dungeon_fence', 'wall_torch', 'dungeon_key', 'submerged_rock1', 'stone_stairs', 'stone_wall', 'stone_wall2', 'stone_floor', 'dungeon_platform', 'rocks1', 'rocks2', 'rocks3', 'rocks4', 'rocks5', 'rocks6', 'dungeon_floor', 'grass1', 'grass2', 'plains_grass_fill_a', 'plains_grass_fill_b', 'plains_pebbles_overlay', 'plains_stone_path_fill', 'plains_stone_wall_fill', 'plains_wildflower_overlay', 'plains_wildflower_overlay_old', 'tree1', 'tree2', 'fence1', 'bush1', 'bush2', 'flower1', 'cart', 'cart2', 'well', 'stone_guardian', 'stone_lantern', 'tile_sign', 'bridge_v', 'bridge_h', 'house1', 'house2', 'house3', 'house4', 'house5', 'interior2', 'interior21', 'interior6', 'interior_door1', 'interior_door2', 'bed1', 'bench1', 'chair1', 'chair2', 'fireplace1', 'kitchen1', 'rug1', 'rug2', 'rug3', 'rug4', 'rug5', 'rug6', 'rug7', 'rug8', 'table1', 'table2', 'sconce_bg', 'wilds_props', 'rocks_spritesheet', 'rocks_spritesheet2', 'roots_spritesheet', 'roots_spritesheet2', 'roots_chest', 'drawbridge_spritesheet', 'mushroom', 'pushing_box', 'hole_with_roots', 'hole_in_wall', 'wall_cracked', 'laser_base', 'laser_nozzle', 'push_lock_depression', 'grey_platform', 'tv_monk', 'sconce_flame', 'fire_interior', 'sconce', 'lava', 'ice_edge', 'ice_ground', 'ice_lake', 'ice_platform', 'ice_shoreline', 'chasm', 'blank', 'dead_tree1', 'dead_tree2', 'dead_tree3', 'crumbled_cottage', 'abandoned_hut', 'shrine'] as const,
} as const;

export type AssetGroupKey = keyof typeof ASSET_GROUPS;

/**
 * Asset groups usable as the `assets` value of an npc entity. Drives the
 * editor's NPC asset dropdown.
 */
export const NPC_ASSET_KEYS = [
  'npc1',
  'old_village_lady',
  'village_boy',
  'village_girl',
  'village_old_man',
  'village_swim_teacher',
  'village_wizard',
] as const;
