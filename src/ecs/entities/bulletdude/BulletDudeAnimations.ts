import { Direction } from '../../../constants/Direction';

const SPRITESHEET_DIRECTION_ORDER = [
  Direction.Down,
  Direction.Up,
  Direction.Left,
  Direction.Right,
  Direction.UpLeft,
  Direction.UpRight,
  Direction.DownLeft,
  Direction.DownRight
];

function getDirectionIndex(direction: Direction): number {
  return SPRITESHEET_DIRECTION_ORDER.indexOf(direction);
}

function getIdleFrame(direction: Direction): number {
  const dirIndex = getDirectionIndex(direction);
  return dirIndex * 4;
}

function getWalkFrames(direction: Direction): number[] {
  const dirIndex = getDirectionIndex(direction);
  const baseFrame = dirIndex * 4;
  return [baseFrame + 1, baseFrame + 2, baseFrame + 3];
}

export function createBulletDudeAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('bulletdude_idle_down')) {
    return;
  }

  for (const direction of SPRITESHEET_DIRECTION_ORDER) {
    const dirName = Direction[direction].toLowerCase();

    scene.anims.create({
      key: `bulletdude_idle_${dirName}`,
      frames: [{ key: 'bullet_dude_sprite', frame: getIdleFrame(direction) }],
      frameRate: 1,
      repeat: 0
    });

    scene.anims.create({
      key: `bulletdude_walk_${dirName}`,
      frames: getWalkFrames(direction).map(frame => ({ key: 'bullet_dude_sprite', frame })),
      frameRate: 4,
      repeat: -1,
      yoyo: true
    });
  }
}
