import type Phaser from 'phaser';
import { Direction } from '../../../constants/Direction';

const ALPHABETICAL_DIRS = ['east', 'north-east', 'north-west', 'north', 'south-east', 'south-west', 'south', 'west'];

const DIR_TO_INDEX: Record<Direction, number> = {
  [Direction.None]: 6,
  [Direction.Down]: 6,
  [Direction.Up]: 3,
  [Direction.Left]: 7,
  [Direction.Right]: 0,
  [Direction.UpLeft]: 2,
  [Direction.UpRight]: 1,
  [Direction.DownLeft]: 5,
  [Direction.DownRight]: 4,
};

export function createNPCAnimations(scene: Phaser.Scene, spritesheet: string): void {
  const firstKey = `${spritesheet}_idle_${ALPHABETICAL_DIRS[0]}`;
  if (scene.anims.exists(firstKey)) {
    return;
  }

  const texture = scene.textures.get(spritesheet);
  const frameCount = texture.frameTotal - 1;

  if (frameCount <= 1) {
    scene.anims.create({
      key: `${spritesheet}_idle_static`,
      frames: [{ key: spritesheet, frame: 0 }],
      frameRate: 1,
      repeat: 0
    });
    return;
  }

  ALPHABETICAL_DIRS.forEach((dir, index) => {
    scene.anims.create({
      key: `${spritesheet}_idle_${dir}`,
      frames: [{ key: spritesheet, frame: index }],
      frameRate: 1,
      repeat: 0
    });
  });
}

export function getNPCAnimKey(spritesheet: string, direction: Direction, frameCount: number): string {
  if (frameCount <= 1) {
    return `${spritesheet}_idle_static`;
  }
  const index = DIR_TO_INDEX[direction];
  const dirName = ALPHABETICAL_DIRS[index];
  return `${spritesheet}_idle_${dirName}`;
}
