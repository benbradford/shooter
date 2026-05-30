import type Phaser from 'phaser';
import { Direction } from '../../../constants/Direction';

// Spritesheet layout (4-directional, order: east, north, south, west):
// Frames 0-3: idle (1 frame × 4 dirs)
// Frames 4-35: sneak (8 frames × 4 dirs)
// Frames 36-51: run (4 frames × 4 dirs)

const DIRS = ['east', 'north', 'south', 'west'] as const;
const IDLE_START = 0;
const SNEAK_START = 4;
const SNEAK_FRAMES = 8;
const RUN_START = 36;
const RUN_FRAMES = 4;

const DIR_TO_INDEX: Record<Direction, number> = {
  [Direction.None]: 2,       // south
  [Direction.Down]: 2,       // south
  [Direction.Up]: 1,         // north
  [Direction.Left]: 3,       // west
  [Direction.Right]: 0,      // east
  [Direction.UpLeft]: 3,     // west
  [Direction.UpRight]: 0,    // east
  [Direction.DownLeft]: 3,   // west
  [Direction.DownRight]: 0,  // east
};

export function createBeetleAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('beetle_idle_east')) return;

  DIRS.forEach((dir, index) => {
    scene.anims.create({
      key: `beetle_idle_${dir}`,
      frames: [{ key: 'beetle', frame: IDLE_START + index }],
      frameRate: 1,
      repeat: -1
    });

    scene.anims.create({
      key: `beetle_sneak_${dir}`,
      frames: scene.anims.generateFrameNumbers('beetle', {
        start: SNEAK_START + index * SNEAK_FRAMES,
        end: SNEAK_START + index * SNEAK_FRAMES + SNEAK_FRAMES - 1
      }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: `beetle_run_${dir}`,
      frames: scene.anims.generateFrameNumbers('beetle', {
        start: RUN_START + index * RUN_FRAMES,
        end: RUN_START + index * RUN_FRAMES + RUN_FRAMES - 1
      }),
      frameRate: 12,
      repeat: -1
    });
  });
}

export function getBeetleAnimKey(animType: string, direction: Direction): string {
  const index = DIR_TO_INDEX[direction];
  return `beetle_${animType}_${DIRS[index]}`;
}
