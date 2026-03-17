import { Animation } from '../../../systems/animation/Animation';
import { ALL_DIRECTIONS, DIR_8_TO_4, DIR_8_TO_8, type PetConfig, type PetSpritesheetMetadata } from './PetConfig';

function rangeToFrameStrings(start: number, end: number): string[] {
  const frames: string[] = [];
  for (let i = start; i <= end; i++) {
    frames.push(String(i));
  }
  return frames;
}

export function createPetAnimationMap(
  metadata: PetSpritesheetMetadata,
  config: PetConfig
): Map<string, Animation> {
  const animMap = new Map<string, Animation>();
  const dirMap = config.directions === 4 ? DIR_8_TO_4 : DIR_8_TO_8;

  ALL_DIRECTIONS.forEach(dir => {
    const metaDir = dirMap[dir];
    
    const idleRange = metadata.animations[config.idleAnim]?.[metaDir];
    if (idleRange) {
      const frames = rangeToFrameStrings(idleRange.start, idleRange.end);
      animMap.set(`idle_${dir}`, new Animation(frames, 'repeat', 0.125));
    }
    
    const walkRange = metadata.animations[config.walkAnim]?.[metaDir];
    if (walkRange) {
      const frames = rangeToFrameStrings(walkRange.start, walkRange.end);
      animMap.set(`walk_${dir}`, new Animation(frames, 'repeat', 0.1));
    }

    const barkRange = metadata.animations['bark']?.[metaDir];
    if (barkRange) {
      const frames = rangeToFrameStrings(barkRange.start, barkRange.end);
      animMap.set(`bark_${dir}`, new Animation(frames, 'once', 0.1));
    }

    if (config.runAnim) {
      const runRange = metadata.animations[config.runAnim]?.[metaDir];
      if (runRange) {
        const frames = rangeToFrameStrings(runRange.start, runRange.end);
        animMap.set(`run_${dir}`, new Animation(frames, 'repeat', 0.08));
      }
    }
  });

  return animMap;
}
