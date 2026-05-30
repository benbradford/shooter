import { Direction } from '../../../constants/Direction';

// Spritesheet direction order: east(0), north(1), south(2), west(3)
const WORM_DIRECTIONS = [Direction.Right, Direction.Up, Direction.Down, Direction.Left];

const DIR_TO_INDEX: Record<number, number> = {
  [Direction.Right]: 0,
  [Direction.UpRight]: 0,
  [Direction.DownRight]: 0,
  [Direction.Up]: 1,
  [Direction.Down]: 2,
  [Direction.None]: 2,
  [Direction.DownLeft]: 3,
  [Direction.UpLeft]: 3,
  [Direction.Left]: 3,
};

function getDirIndex(direction: Direction): number {
  return DIR_TO_INDEX[direction] ?? 2;
}

export function getWormCardinalDirection(direction: Direction): Direction {
  return WORM_DIRECTIONS[getDirIndex(direction)];
}

export function getWormAnimKey(animType: string, direction: Direction): string {
  const dirName = Direction[getWormCardinalDirection(direction)].toLowerCase();
  return `worm_${animType}_${dirName}`;
}

export function createWormAnimations(scene: Phaser.Scene): void {
  // Always remove and recreate — animations may hold stale texture references after level transitions
  if (scene.anims.exists('worm_idle_down')) {
    for (const dir of WORM_DIRECTIONS) {
      const dirName = Direction[dir].toLowerCase();
      scene.anims.remove(`worm_idle_${dirName}`);
      scene.anims.remove(`worm_walk_${dirName}`);
      scene.anims.remove(`worm_spit_${dirName}`);
    }
  }

  for (let i = 0; i < WORM_DIRECTIONS.length; i++) {
    const dir = WORM_DIRECTIONS[i];
    const dirName = Direction[dir].toLowerCase();

    // Idle: frames 0-3 (one per direction)
    scene.anims.create({
      key: `worm_idle_${dirName}`,
      frames: [{ key: 'worm', frame: i }],
      frameRate: 1,
      repeat: 0
    });

    // Walk: frames 4-19 (4 frames per direction)
    const walkStart = 4 + i * 4;
    scene.anims.create({
      key: `worm_walk_${dirName}`,
      frames: scene.anims.generateFrameNumbers('worm', { start: walkStart, end: walkStart + 3 }),
      frameRate: 8,
      repeat: -1
    });

    // Spit: frames 20-39 (5 frames per direction)
    const spitStart = 20 + i * 5;
    scene.anims.create({
      key: `worm_spit_${dirName}`,
      frames: scene.anims.generateFrameNumbers('worm', { start: spitStart, end: spitStart + 4 }),
      frameRate: 10,
      repeat: 0
    });
  }
}
