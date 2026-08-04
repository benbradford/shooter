import type Phaser from 'phaser';

const SPRITESHEET_KEY = 'minion';

/**
 * Spritesheet frame layout (68x68, 8 columns):
 *   0-3:   idle (south, east, north, west)
 *   4-7:   run_south
 *   8-11:  run_east
 *   12-15: run_north
 *   16-19: run_west
 *   20-26: throw_south
 *   27-33: throw_east
 *   34-40: throw_north
 *   41-47: throw_west
 *   48-56: death_forward_south (9 frames)
 *   57-63: death_backward_south (7 frames)
 *   64-76: spawn_north (13 frames)
 */

const IDLE_SOUTH = 0;
const IDLE_EAST = 1;
const IDLE_NORTH = 2;
const IDLE_WEST = 3;

const RUN_SOUTH_START = 4;
const RUN_EAST_START = 8;
const RUN_NORTH_START = 12;
const RUN_WEST_START = 16;
const RUN_FRAME_COUNT = 4;

const THROW_SOUTH_START = 20;
const THROW_EAST_START = 27;
const THROW_NORTH_START = 34;
const THROW_WEST_START = 41;
const THROW_FRAME_COUNT = 7;

const DEATH_FORWARD_START = 48;
const DEATH_FORWARD_COUNT = 9;

const DEATH_BACKWARD_START = 57;
const DEATH_BACKWARD_COUNT = 7;

const SPAWN_START = 64;
const SPAWN_COUNT = 13;

const RUN_FRAME_RATE = 10;
const THROW_FRAME_RATE = 12;
const DEATH_FRAME_RATE = 10;
const SPAWN_FRAME_RATE = 10;

type Dir = 'south' | 'east' | 'north' | 'west';

const DIRECTIONS: Dir[] = ['south', 'east', 'north', 'west'];
const IDLE_FRAMES: Record<Dir, number> = {
  south: IDLE_SOUTH,
  east: IDLE_EAST,
  north: IDLE_NORTH,
  west: IDLE_WEST,
};
const RUN_STARTS: Record<Dir, number> = {
  south: RUN_SOUTH_START,
  east: RUN_EAST_START,
  north: RUN_NORTH_START,
  west: RUN_WEST_START,
};
const THROW_STARTS: Record<Dir, number> = {
  south: THROW_SOUTH_START,
  east: THROW_EAST_START,
  north: THROW_NORTH_START,
  west: THROW_WEST_START,
};

export function createMinionAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('minion_idle_south')) return;

  // Idle: one frame per direction
  for (const dir of DIRECTIONS) {
    scene.anims.create({
      key: `minion_idle_${dir}`,
      frames: [{ key: SPRITESHEET_KEY, frame: IDLE_FRAMES[dir] }],
      frameRate: 1,
      repeat: 0,
    });
  }

  // Run: 4 frames per direction, looping
  for (const dir of DIRECTIONS) {
    scene.anims.create({
      key: `minion_run_${dir}`,
      frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
        start: RUN_STARTS[dir],
        end: RUN_STARTS[dir] + RUN_FRAME_COUNT - 1,
      }),
      frameRate: RUN_FRAME_RATE,
      repeat: -1,
    });
  }

  // Throw: 7 frames per direction, play once
  for (const dir of DIRECTIONS) {
    scene.anims.create({
      key: `minion_throw_${dir}`,
      frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
        start: THROW_STARTS[dir],
        end: THROW_STARTS[dir] + THROW_FRAME_COUNT - 1,
      }),
      frameRate: THROW_FRAME_RATE,
      repeat: 0,
    });
  }

  // Death forward (collapse south)
  scene.anims.create({
    key: 'minion_death_forward',
    frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
      start: DEATH_FORWARD_START,
      end: DEATH_FORWARD_START + DEATH_FORWARD_COUNT - 1,
    }),
    frameRate: DEATH_FRAME_RATE,
    repeat: 0,
  });

  // Death backward (falling back south)
  scene.anims.create({
    key: 'minion_death_backward',
    frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
      start: DEATH_BACKWARD_START,
      end: DEATH_BACKWARD_START + DEATH_BACKWARD_COUNT - 1,
    }),
    frameRate: DEATH_FRAME_RATE,
    repeat: 0,
  });

  // Spawn (falling down from above, north-facing)
  scene.anims.create({
    key: 'minion_spawn',
    frames: scene.anims.generateFrameNumbers(SPRITESHEET_KEY, {
      start: SPAWN_START,
      end: SPAWN_START + SPAWN_COUNT - 1,
    }),
    frameRate: SPAWN_FRAME_RATE,
    repeat: 0,
  });
}

export function getMinionIdleFrame(dir: Dir): number {
  return IDLE_FRAMES[dir];
}
