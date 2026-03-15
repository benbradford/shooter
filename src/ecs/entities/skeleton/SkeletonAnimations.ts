import { Direction } from '../../../constants/Direction';

const SPRITESHEET_DIRECTION_ORDER = [
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
  return SPRITESHEET_DIRECTION_ORDER.indexOf(direction);
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
  // Always recreate animations to ensure frames are fresh
  const animKeys = [
    'skeleton_idle_down', 'skeleton_idle_up', 'skeleton_idle_left', 'skeleton_idle_right',
    'skeleton_idle_downleft', 'skeleton_idle_downright', 'skeleton_idle_upleft', 'skeleton_idle_upright',
    'skeleton_walk_down', 'skeleton_walk_up', 'skeleton_walk_left', 'skeleton_walk_right',
    'skeleton_walk_downleft', 'skeleton_walk_downright', 'skeleton_walk_upleft', 'skeleton_walk_upright',
    'skeleton_throw_down', 'skeleton_throw_up', 'skeleton_throw_left', 'skeleton_throw_right',
    'skeleton_throw_downleft', 'skeleton_throw_downright', 'skeleton_throw_upleft', 'skeleton_throw_upright',
    'skeleton_hit_down', 'skeleton_hit_up', 'skeleton_hit_left', 'skeleton_hit_right',
    'skeleton_hit_downleft', 'skeleton_hit_downright', 'skeleton_hit_upleft', 'skeleton_hit_upright',
    'skeleton_death'
  ];
  
  animKeys.forEach(key => {
    if (scene.anims.exists(key)) {
      scene.anims.remove(key);
    }
  });

  for (const direction of SPRITESHEET_DIRECTION_ORDER) {
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

