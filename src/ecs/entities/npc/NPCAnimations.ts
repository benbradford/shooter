import type Phaser from 'phaser';
import { Direction } from '../../../constants/Direction';

const ALPHABETICAL_DIRS = ['east', 'north-east', 'north-west', 'north', 'south-east', 'south-west', 'south', 'west'];

type NPCAnimDef = { name: string; startFrame: number; frameCount: number; frameRate: number; repeat?: number };

const NPC_ANIM_METADATA: Record<string, NPCAnimDef[]> = {
  village_swim_teacher: [
    { name: 'push', startFrame: 8, frameCount: 6, frameRate: 10 },
  ],
};

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
    // Check if frames are still valid (texture may have been unloaded/reloaded)
    const anim = scene.anims.get(firstKey);
    if ((anim?.frames[0]?.frame as { sourceSize?: unknown })?.sourceSize) {
      return;
    }
    // Stale — remove all animations for this spritesheet
    ALPHABETICAL_DIRS.forEach((dir) => scene.anims.remove(`${spritesheet}_idle_${dir}`));
    scene.anims.remove(`${spritesheet}_idle_static`);
    const metadata = NPC_ANIM_METADATA[spritesheet];
    if (metadata) {
      for (const anim of metadata) scene.anims.remove(`${spritesheet}_${anim.name}`);
    }
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

  // Create extra animations if spritesheet has more than 8 frames
  // Frames 8+ are additional animations defined in metadata
  if (frameCount > 8) {
    const metadata = NPC_ANIM_METADATA[spritesheet];
    if (metadata) {
      for (const anim of metadata) {
        const frames = [];
        for (let i = anim.startFrame; i < anim.startFrame + anim.frameCount; i++) {
          frames.push({ key: spritesheet, frame: i });
        }
        scene.anims.create({
          key: `${spritesheet}_${anim.name}`,
          frames,
          frameRate: anim.frameRate,
          repeat: anim.repeat ?? 0
        });
      }
    }
  }
}

export function getNPCAnimKey(spritesheet: string, direction: Direction, frameCount: number): string {
  if (frameCount <= 1) {
    return `${spritesheet}_idle_static`;
  }
  const index = DIR_TO_INDEX[direction];
  const dirName = ALPHABETICAL_DIRS[index];
  return `${spritesheet}_idle_${dirName}`;
}
