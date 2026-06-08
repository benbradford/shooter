import type Phaser from 'phaser';
import { Direction } from '../../../constants/Direction';

// Spritesheet layout (4-directional):
// Frames 0-3: idle rotations (east, north, south, west)
// Frames 4-8: flap east (5 frames)
// Frames 9-13: flap east variant 2 (unused)
// Frames 14-18: flap north (5 frames)
// Frames 19-23: flap south (5 frames)
// Frames 24-28: flap west (5 frames)

const DIRS = ['east', 'north', 'south', 'west'] as const;
const FLAP_STARTS = [4, 14, 19, 24]; // east, north, south, west
const FLAP_FRAMES = 5;

const DIR_TO_INDEX: Record<Direction, number> = {
  [Direction.None]: 2,
  [Direction.Down]: 2,
  [Direction.Up]: 1,
  [Direction.Left]: 3,
  [Direction.Right]: 0,
  [Direction.UpLeft]: 3,
  [Direction.UpRight]: 0,
  [Direction.DownLeft]: 3,
  [Direction.DownRight]: 0,
};

export function createFlyAnimations(scene: Phaser.Scene): void {
  if (!scene.textures.exists('fly')) return;

  for (const dir of DIRS) {
    if (scene.anims.exists(`fly_flap_${dir}`)) {
      scene.anims.remove(`fly_flap_${dir}`);
    }
  }

  DIRS.forEach((dir, index) => {
    scene.anims.create({
      key: `fly_flap_${dir}`,
      frames: scene.anims.generateFrameNumbers('fly', {
        start: FLAP_STARTS[index],
        end: FLAP_STARTS[index] + FLAP_FRAMES - 1
      }),
      frameRate: 12,
      repeat: -1
    });
  });
}

export function getFlyAnimKey(direction: Direction): string {
  const index = DIR_TO_INDEX[direction];
  return `fly_flap_${DIRS[index]}`;
}
