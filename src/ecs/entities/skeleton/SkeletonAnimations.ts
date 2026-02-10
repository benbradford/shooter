import { Direction } from '../../../constants/Direction';

const DIRECTION_ORDER = [
  Direction.Down,
  Direction.DownRight,
  Direction.Right,
  Direction.UpRight,
  Direction.Up,
  Direction.UpLeft,
  Direction.Left,
  Direction.DownLeft
];

function getDirectionIndex(direction: Direction): number {
  return DIRECTION_ORDER.indexOf(direction);
}

function getIdleFrame(direction: Direction): number {
  const dirIndex = getDirectionIndex(direction);
  return dirIndex * 6;
}

function getWalkFrames(direction: Direction): number[] {
  const dirIndex = getDirectionIndex(direction);
  const baseRow = 8 + dirIndex;
  const baseFrame = baseRow * 6;
  return [baseFrame, baseFrame + 1, baseFrame + 2, baseFrame + 3];
}

function getJabFrames(direction: Direction): number[] {
  const dirIndex = getDirectionIndex(direction);
  const baseRow = 16 + dirIndex;
  const baseFrame = baseRow * 6;
  return [baseFrame, baseFrame + 1, baseFrame + 2];
}

export function createSkeletonAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists('skeleton_idle_down')) {
    return;
  }

  for (const direction of DIRECTION_ORDER) {
    const dirName = Direction[direction].toLowerCase();

    scene.anims.create({
      key: `skeleton_idle_${dirName}`,
      frames: [{ key: 'skeleton', frame: getIdleFrame(direction) }],
      frameRate: 1,
      repeat: 0
    });

    scene.anims.create({
      key: `skeleton_walk_${dirName}`,
      frames: getWalkFrames(direction).map(frame => ({ key: 'skeleton', frame })),
      frameRate: 8,
      repeat: -1
    });

    scene.anims.create({
      key: `skeleton_jab_${dirName}`,
      frames: getJabFrames(direction).map(frame => ({ key: 'skeleton', frame })),
      frameRate: 12,
      repeat: 0
    });
  }
}

