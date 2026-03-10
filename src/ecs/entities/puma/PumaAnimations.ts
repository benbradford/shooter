import type Phaser from 'phaser';
import { Direction } from '../../../constants/Direction';

const ALPHABETICAL_DIRS = ['east', 'north', 'north-east', 'north-west', 'south', 'south-east', 'south-west', 'west'];

const DIR_TO_INDEX: Record<Direction, number> = {
  [Direction.None]: 4,
  [Direction.Down]: 4,
  [Direction.Up]: 1,
  [Direction.Left]: 7,
  [Direction.Right]: 0,
  [Direction.UpLeft]: 3,
  [Direction.UpRight]: 2,
  [Direction.DownLeft]: 6,
  [Direction.DownRight]: 5,
};

export function createPumaAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('puma_idle_east')) {
    return;
  }

  ALPHABETICAL_DIRS.forEach((dir, index) => {
    scene.anims.create({
      key: `puma_idle_${dir}`,
      frames: [{ key: 'puma', frame: index }],
      frameRate: 1,
      repeat: 0
    });

    const angryStart = 8 + (index * 7);
    scene.anims.create({
      key: `puma_angry_${dir}`,
      frames: scene.anims.generateFrameNumbers('puma', { start: angryStart, end: angryStart + 6 }),
      frameRate: 10,
      repeat: -1
    });

    const jumpStart = 64 + (index * 8);
    scene.anims.create({
      key: `puma_jump_${dir}`,
      frames: scene.anims.generateFrameNumbers('puma', { start: jumpStart, end: jumpStart + 7 }),
      frameRate: 10,
      repeat: 0
    });

    const runStart = 128 + (index * 4);
    scene.anims.create({
      key: `puma_run_${dir}`,
      frames: scene.anims.generateFrameNumbers('puma', { start: runStart, end: runStart + 3 }),
      frameRate: 10,
      repeat: -1
    });

    const seatedStart = 160 + (index * 10);
    scene.anims.create({
      key: `puma_seated_${dir}`,
      frames: scene.anims.generateFrameNumbers('puma', { start: seatedStart, end: seatedStart + 9 }),
      frameRate: 8,
      repeat: -1
    });

    const standStart = 240 + (index * 8);
    scene.anims.create({
      key: `puma_standup_${dir}`,
      frames: scene.anims.generateFrameNumbers('puma', { start: standStart, end: standStart + 7 }),
      frameRate: 12,
      repeat: 0
    });
  });
}

export function getPumaAnimKey(animType: string, direction: Direction): string {
  const index = DIR_TO_INDEX[direction];
  const dirName = ALPHABETICAL_DIRS[index];
  return `puma_${animType}_${dirName}`;
}
