import type Phaser from 'phaser';
import { Direction } from '../../../constants/Direction';

// Alphabetical order (how sprite sheet is organized)
const ALPHABETICAL_DIRS = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];

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

export function createThrowerAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('thrower_idle_east')) {
    return;
  }
  
  ALPHABETICAL_DIRS.forEach((dir, index) => {
    scene.anims.create({
      key: `thrower_idle_${dir}`,
      frames: [{ key: 'thrower', frame: index }],
      frameRate: 1,
      repeat: 0
    });

    scene.anims.create({
      key: `thrower_throw_${dir}`,
      frames: scene.anims.generateFrameNumbers('thrower', { start: 8 + index * 7, end: 8 + index * 7 + 6 }),
      frameRate: 12,
      repeat: 0
    });

    scene.anims.create({
      key: `thrower_walk_${dir}`,
      frames: scene.anims.generateFrameNumbers('thrower', { start: 64 + index * 4, end: 64 + index * 4 + 3 }),
      frameRate: 10,
      repeat: -1
    });

    scene.anims.create({
      key: `thrower_hit_${dir}`,
      frames: scene.anims.generateFrameNumbers('thrower', { start: 96 + index * 6, end: 96 + index * 6 + 5 }),
      frameRate: 12,
      repeat: 0
    });

    scene.anims.create({
      key: `thrower_death_${dir}`,
      frames: scene.anims.generateFrameNumbers('thrower', { start: 144 + index * 7, end: 144 + index * 7 + 6 }),
      frameRate: 12,
      repeat: 0
    });
  });
}

export function getThrowerAnimKey(animType: 'idle' | 'throw' | 'walk' | 'hit' | 'death', direction: Direction): string {
  const index = DIR_TO_INDEX[direction];
  const dirName = ALPHABETICAL_DIRS[index];
  return `thrower_${animType}_${dirName}`;
}
