import type Phaser from 'phaser';
import { Direction } from '../../../constants/Direction';

const SPRITESHEET_KEY = 'tv_monk';

// Alphabetical order (how sprite sheet is organized)
const ALPHABETICAL_DIRS = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'] as const;

// Map Direction enum to alphabetical index
const DIR_TO_INDEX: Record<Direction, number> = {
  [Direction.None]: 4, // south
  [Direction.Down]: 4, // south
  [Direction.Up]: 1, // north
  [Direction.Left]: 7, // west
  [Direction.Right]: 0, // east
  [Direction.UpLeft]: 3, // north-west
  [Direction.UpRight]: 2, // north-east
  [Direction.DownLeft]: 6, // south-west
  [Direction.DownRight]: 5, // south-east
};

// Frame layout (8 columns):
// Row 0 (0-7):   idle rotations (all 8 dirs, alphabetical)
// Row 1 (8-11):  raise_hands south (4 frames)
// Row 2 (16-20): raise_hands north (5 frames)
// Row 3 (24-29): hit south (6 frames)
// Row 4-5 (32-41): death south (10 frames)
const IDLE_START_FRAME = 0;
const RAISE_HANDS_SOUTH_START = 8;
const RAISE_HANDS_SOUTH_COUNT = 4;
const RAISE_HANDS_NORTH_START = 16;
const RAISE_HANDS_NORTH_COUNT = 5;
const HIT_SOUTH_START = 24;
const HIT_SOUTH_COUNT = 6;
const DEATH_SOUTH_START = 32;
const DEATH_SOUTH_COUNT = 10;

const RAISE_HANDS_FRAME_RATE = 8;
const HIT_FRAME_RATE = 12;
const DEATH_FRAME_RATE = 8;

export function createTvMonkAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('tv_monk_idle_east')) {
    return;
  }

  // Idle: one frame per direction
  ALPHABETICAL_DIRS.forEach((dir, index) => {
    scene.anims.create({
      key: `tv_monk_idle_${dir}`,
      frames: [{ key: SPRITESHEET_KEY, frame: IDLE_START_FRAME + index }],
      frameRate: 1,
      repeat: 0,
    });
  });

  // Raise hands south
  scene.anims.create({
    key: 'tv_monk_raise_hands_south',
    frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
      start: RAISE_HANDS_SOUTH_START,
      end: RAISE_HANDS_SOUTH_START + RAISE_HANDS_SOUTH_COUNT - 1,
    }),
    frameRate: RAISE_HANDS_FRAME_RATE,
    repeat: 0,
  });

  // Raise hands north
  scene.anims.create({
    key: 'tv_monk_raise_hands_north',
    frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
      start: RAISE_HANDS_NORTH_START,
      end: RAISE_HANDS_NORTH_START + RAISE_HANDS_NORTH_COUNT - 1,
    }),
    frameRate: RAISE_HANDS_FRAME_RATE,
    repeat: 0,
  });

  // Hit south
  scene.anims.create({
    key: 'tv_monk_hit_south',
    frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
      start: HIT_SOUTH_START,
      end: HIT_SOUTH_START + HIT_SOUTH_COUNT - 1,
    }),
    frameRate: HIT_FRAME_RATE,
    repeat: 0,
  });

  // Death south
  scene.anims.create({
    key: 'tv_monk_death_south',
    frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
      start: DEATH_SOUTH_START,
      end: DEATH_SOUTH_START + DEATH_SOUTH_COUNT - 1,
    }),
    frameRate: DEATH_FRAME_RATE,
    repeat: 0,
  });
}

export type TvMonkAnimType = 'idle' | 'raise_hands' | 'hit' | 'death';

export function getTvMonkAnimKey(animType: TvMonkAnimType, direction: Direction): string {
  if (animType === 'idle') {
    const index = DIR_TO_INDEX[direction];
    return `tv_monk_idle_${ALPHABETICAL_DIRS[index]}`;
  }
  // Non-idle anims are south-only (or south+north for raise_hands)
  if (animType === 'raise_hands') {
    const index = DIR_TO_INDEX[direction];
    const dirName = ALPHABETICAL_DIRS[index];
    if (dirName === 'north') return 'tv_monk_raise_hands_north';
    return 'tv_monk_raise_hands_south';
  }
  return `tv_monk_${animType}_south`;
}

/** Get the idle frame index for a direction (used by TvFaceComponent for canvas rendering) */
export function getTvMonkIdleFrame(direction: Direction): number {
  return IDLE_START_FRAME + DIR_TO_INDEX[direction];
}
